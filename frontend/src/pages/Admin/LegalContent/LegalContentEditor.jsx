/**
 * ============================================
 * ADMIN MODULE — Legal & Disclaimers (super admin)
 * ============================================
 * For the program picked in the sidebar:
 *  - Privacy Policy page   → title + sections
 *  - Terms of Use page     → heading, subtitle, highlight box + sections
 *  - Disclaimers           → the built-in ones (sign-up agreement, checkout
 *                            agreement, booking rules) and any the admin adds
 *                            to the sign-up page, booking checkout, program
 *                            checkout or the footer of every page.
 *
 * - A program never edited shows the original text.
 * - Built-in disclaimers can be edited or switched off, not deleted.
 * - Changes only go live on "Save changes". Two admins saving at once can't
 *   overwrite each other. "Last updated" on a page moves to today only when
 *   that page's text changes.
 *
 * Route: /admin/legal   ·   Access: Super Admin only
 * ============================================
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { useSelectedProgram, AVAILABLE_PROGRAMS } from "../../../context/SelectedProgramContext";
import { getLegalContent, saveLegalContent } from "../../../services/adminLegalContentService";
import { LegalInline, LegalNotices, LegalParagraphs } from "../../../components/customer/legal/LegalText";
import { formatLegalDate } from "../../../utils/legalDefaults";
import { formatUtcDate } from "../../../utils/time";
import { confirmDialog } from "../../../utils/confirmDialog";

// ============================================
// 🧰 HELPERS
// ============================================
const MAX_SECTIONS = 30;
const MAX_NOTICES = 40;

const PLACEMENTS = [
  { id: "signup", label: "Sign-up page", hint: "Under the agreement tick box." },
  { id: "booking_checkout", label: "Doctor booking checkout", hint: "Booking rules box and above the pay button." },
  { id: "program_checkout", label: "Program checkout", hint: "Above the pay button when buying a plan." },
  { id: "site_footer", label: "Footer of every page", hint: "Small print above the copyright line." },
];

const pageOf = (p, withAccent) =>
  withAccent
    ? {
        title: p.title || "",
        titleAccent: p.titleAccent || "",
        subtitle: p.subtitle || "",
        highlightTitle: p.highlightTitle || "",
        highlightText: p.highlightText || "",
        sections: p.sections.map((s) => ({ heading: s.heading || "", body: s.body || "" })),
      }
    : { title: p.title || "", sections: p.sections.map((s) => ({ heading: s.heading || "", body: s.body || "" })) };

const noticeOf = (n) => ({
  key: n.key,
  builtIn: !!n.builtIn,
  required: !!n.required,
  label: n.label || "",
  placement: n.placement,
  tone: n.tone || "info",
  text: n.text || "",
  enabled: n.enabled !== false,
});

const draftOf = (c) => ({
  privacy: pageOf(c.privacy, false),
  terms: pageOf(c.terms, true),
  notices: c.notices.map(noticeOf),
});

// what goes to the server (and what "unsaved changes" compares)
const payloadOf = (d) => ({
  privacy: d.privacy,
  terms: d.terms,
  notices: d.notices.map(({ key, label, placement, tone, text, enabled }) => ({ key, label, placement, tone, text, enabled })),
});
const same = (a, b) => JSON.stringify(payloadOf(a)) === JSON.stringify(payloadOf(b));

const newKey = () => `n_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

const move = (arr, i, d) => {
  const out = [...arr];
  [out[i], out[i + d]] = [out[i + d], out[i]];
  return out;
};

const rowsFor = (text, min = 3, max = 16) =>
  Math.min(max, Math.max(min, String(text || "").split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 95)), 0)));

// first problem in the draft, or "" (the server checks again)
const validate = (d) => {
  const page = (p, name) => {
    if (!p.title.trim()) return `${name}: the title can't be empty.`;
    if (!p.sections.length) return `${name}: add at least one section.`;
    for (const [i, s] of p.sections.entries()) {
      if (!s.heading.trim()) return `${name}: section ${i + 1} needs a heading.`;
      if (!s.body.trim()) return `${name}: section ${i + 1} needs some text.`;
    }
    return "";
  };
  const err = page(d.privacy, "Privacy Policy") || page(d.terms, "Terms of Use");
  if (err) return err;
  for (const n of d.notices) {
    const name = n.builtIn ? `“${n.label}”` : `“${n.label || "New disclaimer"}”`;
    if (!n.builtIn && !n.label.trim()) return "Every added disclaimer needs a name (only admins see it).";
    if (!n.text.trim()) return `${name}: the text can't be empty — switch it off instead.`;
    if (n.key === "signup_consent" && (!n.text.includes("{terms}") || !n.text.includes("{privacy}"))) {
      return `${name} must keep {terms} and {privacy} so people can open both pages before agreeing.`;
    }
  }
  return "";
};

const inputCls =
  "rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";

const IconBtn = ({ label, onClick, disabled, danger, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
      danger ? "text-gray-400 hover:text-rose-600 hover:bg-rose-50" : "text-gray-500 hover:bg-gray-100"
    }`}
  >
    {children}
  </button>
);

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
  </label>
);

const Switch = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={disabled ? "Always shown" : checked ? "Shown — click to switch off" : "Off — click to show"}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? "bg-emerald-500" : "bg-gray-300"
    }`}
  >
    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
  </button>
);

const TokenHelp = () => (
  <p className="text-[11px] text-gray-500 leading-relaxed">
    Type <code className="px-1 rounded bg-gray-100 text-gray-700">{"{brand}"}</code> for the program name,{" "}
    <code className="px-1 rounded bg-gray-100 text-gray-700">{"{terms}"}</code> /{" "}
    <code className="px-1 rounded bg-gray-100 text-gray-700">{"{privacy}"}</code> for links to those pages. Leave a blank line
    to start a new paragraph.
  </p>
);

// ============================================
// 📄 SECTIONS (Privacy + Terms)
// ============================================
const SectionsEditor = ({ sections, onChange }) => {
  const set = (i, patch) => onChange(sections.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-3">
      {sections.map((s, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-3 sm:p-4 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 flex-1">Section {i + 1}</span>
            <IconBtn label="Move up" onClick={() => onChange(move(sections, i, -1))} disabled={i === 0}>
              <ArrowUp size={14} />
            </IconBtn>
            <IconBtn label="Move down" onClick={() => onChange(move(sections, i, 1))} disabled={i === sections.length - 1}>
              <ArrowDown size={14} />
            </IconBtn>
            <IconBtn
              label={sections.length === 1 ? "A page needs at least one section" : `Delete section ${i + 1}`}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: "Delete this section?",
                  message: `“${s.heading || `Section ${i + 1}`}” will be removed from the page when you save.`,
                  confirmLabel: "Delete",
                  tone: "danger",
                });
                if (ok) onChange(sections.filter((_, j) => j !== i));
              }}
              disabled={sections.length === 1}
              danger
            >
              <Trash2 size={14} />
            </IconBtn>
          </div>
          <input
            aria-label={`Section ${i + 1} heading`}
            className={`${inputCls} w-full font-semibold`}
            maxLength={150}
            value={s.heading}
            placeholder="Heading, e.g. 5. Refunds"
            onChange={(e) => set(i, { heading: e.target.value })}
          />
          <textarea
            aria-label={`Section ${i + 1} text`}
            className={`${inputCls} w-full mt-2 leading-relaxed resize-y`}
            maxLength={8000}
            rows={rowsFor(s.body)}
            value={s.body}
            placeholder="Text. Leave a blank line between paragraphs."
            onChange={(e) => set(i, { body: e.target.value })}
          />
          <p className="text-[10px] text-gray-400 text-right">{s.body.length.toLocaleString("en-US")} / 8,000</p>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          if (sections.length >= MAX_SECTIONS) return toast.error(`Up to ${MAX_SECTIONS} sections.`);
          onChange([...sections, { heading: "", body: "" }]);
          return undefined;
        }}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 inline-flex items-center justify-center gap-1.5"
      >
        <Plus size={15} /> Add section
      </button>
    </div>
  );
};

const PagePreview = ({ page, brand, accent }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-8 text-center space-y-6 max-h-[70vh] overflow-y-auto">
    <h2 className="text-2xl font-bold">
      <span className="text-teal-700">{page.title}</span>
      {accent && page.titleAccent && <span className="text-orange-500"> {page.titleAccent}</span>}
    </h2>
    {accent && page.subtitle && (
      <p className="text-sm text-gray-500 max-w-2xl mx-auto">
        <LegalInline text={page.subtitle} brand={brand} />
      </p>
    )}
    {accent && (page.highlightTitle || page.highlightText) && (
      <div className="max-w-2xl mx-auto">
        {page.highlightTitle && <p className="text-sm font-semibold text-orange-500 mb-1">{page.highlightTitle}</p>}
        {page.highlightText && (
          <p className="text-sm text-gray-600">
            <LegalInline text={page.highlightText} brand={brand} />
          </p>
        )}
      </div>
    )}
    {page.sections.map((s, i) => (
      <div key={i} className="space-y-3">
        <h3 className="text-base font-bold text-gray-900">{s.heading}</h3>
        <LegalParagraphs text={s.body} brand={brand} className="text-sm text-gray-600 leading-relaxed" />
      </div>
    ))}
  </div>
);

// ============================================
// ⚠️ ONE DISCLAIMER
// ============================================
const NoticeCard = ({ n, brand, first, last, onChange, onMove, onDelete }) => (
  <div className={`rounded-xl border p-3 sm:p-4 ${n.enabled ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"}`}>
    <div className="flex items-start gap-2 flex-wrap">
      <div className="flex-1 min-w-[12rem]">
        {n.builtIn ? (
          <p className={`text-sm font-semibold ${n.enabled ? "text-gray-900" : "text-gray-400"}`}>{n.label}</p>
        ) : (
          <input
            aria-label="Disclaimer name"
            className={`${inputCls} w-full font-semibold`}
            maxLength={80}
            value={n.label}
            placeholder="Name (only admins see it), e.g. Medical disclaimer"
            onChange={(e) => onChange({ label: e.target.value })}
          />
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {n.builtIn ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Built-in</span>
          ) : (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Added</span>
          )}
          {n.required && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Always on</span>}
          {!n.enabled && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Off</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!n.builtIn && (
          <>
            <IconBtn label="Move up" onClick={() => onMove(-1)} disabled={first}>
              <ArrowUp size={14} />
            </IconBtn>
            <IconBtn label="Move down" onClick={() => onMove(1)} disabled={last}>
              <ArrowDown size={14} />
            </IconBtn>
          </>
        )}
        <span className="mx-1">
          <Switch checked={n.enabled} disabled={n.required} label={`Show “${n.label || "disclaimer"}”`} onChange={(v) => onChange({ enabled: v })} />
        </span>
        <IconBtn
          label={n.builtIn ? "Built-in disclaimers can't be deleted — switch it off instead" : `Delete ${n.label || "disclaimer"}`}
          onClick={onDelete}
          disabled={n.builtIn}
          danger
        >
          <Trash2 size={14} />
        </IconBtn>
      </div>
    </div>

    {!n.builtIn && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        <Field label="Shows on">
          <select className={`${inputCls} w-full`} value={n.placement} onChange={(e) => onChange({ placement: e.target.value })}>
            {PLACEMENTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        {n.placement === "site_footer" ? (
          <p className="text-[11px] text-gray-400 sm:self-end sm:pb-2.5">Footer disclaimers show as plain small print.</p>
        ) : (
          <Field label="Style">
            <select className={`${inputCls} w-full`} value={n.tone} onChange={(e) => onChange({ tone: e.target.value })}>
              <option value="info">Note (grey)</option>
              <option value="warning">Warning (amber)</option>
            </select>
          </Field>
        )}
      </div>
    )}

    <textarea
      aria-label={`${n.label || "Disclaimer"} text`}
      className={`${inputCls} w-full mt-3 leading-relaxed resize-y`}
      maxLength={1000}
      rows={rowsFor(n.text, 2, 8)}
      value={n.text}
      placeholder="What people should see"
      onChange={(e) => onChange({ text: e.target.value })}
    />

    {n.text.trim() && (
      <div className="mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Preview</p>
        {n.builtIn || n.placement === "site_footer" ? (
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2">
            <LegalInline text={n.text} brand={brand} linkClassName="text-indigo-600 underline" />
          </p>
        ) : (
          <LegalNotices notices={[n]} brand={brand} />
        )}
      </div>
    )}
  </div>
);

// ============================================
// 🏠 PAGE
// ============================================
const TABS = [
  { id: "privacy", label: "Privacy Policy" },
  { id: "terms", label: "Terms of Use" },
  { id: "notices", label: "Disclaimers" },
];

const LegalContentEditor = () => {
  const { selectedProgramId, selectedProgram, selectProgram } = useSelectedProgram();

  const [loaded, setLoaded] = useState(null); // content as on the server
  const [originals, setOriginals] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState("");
  const [tab, setTab] = useState("privacy");
  const [preview, setPreview] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");

  const loadedFor = useRef(null);
  const reqRef = useRef(0);
  const askingRef = useRef(false); // a "discard changes?" popup is open
  const dirty = !!(loaded && draft && !same(draft, draftOf(loaded)));
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  });

  const load = useCallback(async (programId) => {
    setLoadError("");
    setConflict("");
    setLoaded(null);
    setDraft(null);
    const req = ++reqRef.current;
    try {
      const { content, originals: orig } = await getLegalContent(programId);
      if (req !== reqRef.current) return;
      loadedFor.current = programId;
      setLoaded(content);
      setOriginals(orig);
      setDraft(draftOf(content));
    } catch (err) {
      if (req !== reqRef.current) return;
      setLoadError(err?.response?.data?.message || "Couldn't load the legal pages.");
    }
  }, []);

  // program picked in the sidebar → its content (asks first if there are unsaved changes)
  useEffect(() => {
    if (loadedFor.current === selectedProgramId || askingRef.current) return;
    if (dirtyRef.current && loadedFor.current) {
      const prev = loadedFor.current;
      const next = selectedProgramId;
      const prevName = AVAILABLE_PROGRAMS.find((p) => p.id === prev)?.label || "this program";
      askingRef.current = true;
      confirmDialog({
        title: "Discard unsaved changes?",
        message: `Your legal changes for ${prevName} aren't saved yet. Switching program will lose them.`,
        confirmLabel: "Discard and switch",
        cancelLabel: `Stay on ${prevName}`,
        tone: "warning",
      }).then((ok) => {
        askingRef.current = false;
        if (ok) load(next);
        else selectProgram(prev);
      });
      return;
    }
    load(selectedProgramId);
  }, [selectedProgramId, load, selectProgram]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // ---------- edits ----------
  const setPage = (which, patch) => setDraft((d) => ({ ...d, [which]: { ...d[which], ...patch } }));
  const setNotice = (key, patch) => setDraft((d) => ({ ...d, notices: d.notices.map((n) => (n.key === key ? { ...n, ...patch } : n)) }));

  const moveNotice = (key, dir) =>
    setDraft((d) => {
      const n = d.notices.find((x) => x.key === key);
      const group = d.notices.filter((x) => !x.builtIn && x.placement === n.placement);
      const gi = group.findIndex((x) => x.key === key);
      const other = group[gi + dir];
      if (!other) return d;
      const i = d.notices.findIndex((x) => x.key === key);
      const j = d.notices.findIndex((x) => x.key === other.key);
      const out = [...d.notices];
      [out[i], out[j]] = [out[j], out[i]];
      return { ...d, notices: out };
    });

  const addNotice = (placement) => {
    if (draft.notices.length >= MAX_NOTICES) return toast.error(`Up to ${MAX_NOTICES} disclaimers.`);
    setDraft((d) => ({
      ...d,
      notices: [...d.notices, { key: newKey(), builtIn: false, required: false, label: "", placement, tone: "info", text: "", enabled: true }],
    }));
    return undefined;
  };

  const deleteNotice = async (n) => {
    if (n.builtIn) return;
    const ok = await confirmDialog({
      title: "Delete this disclaimer?",
      message: `“${n.label || "This disclaimer"}” will be removed from the website when you save.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setDraft((d) => ({ ...d, notices: d.notices.filter((x) => x.key !== n.key) }));
  };

  const resetTab = async () => {
    const what = TABS.find((t) => t.id === tab)?.label;
    const extra = tab === "notices" ? " Disclaimers you added are kept but switched off." : "";
    const ok = await confirmDialog({
      title: `Reset ${what} to the original?`,
      message: `The original ${what} text comes back.${extra} Nothing changes on the website until you click Save changes.`,
      confirmLabel: "Reset",
      tone: "warning",
    });
    if (!ok) return;
    const orig = draftOf(originals);
    setDraft((d) => {
      if (tab !== "notices") return { ...d, [tab]: orig[tab] };
      const added = d.notices.filter((n) => !n.builtIn).map((n) => ({ ...n, enabled: false }));
      return { ...d, notices: [...orig.notices, ...added] };
    });
  };

  const doCopy = async () => {
    if (!copyFrom) return;
    const name = AVAILABLE_PROGRAMS.find((p) => p.id === copyFrom)?.label || copyFrom;
    if (
      dirty &&
      !(await confirmDialog({
        title: `Copy from ${name}?`,
        message: `Your unsaved changes will be replaced with ${name}'s pages and disclaimers.`,
        confirmLabel: "Replace and copy",
        tone: "warning",
      }))
    ) {
      return;
    }
    try {
      const { content } = await getLegalContent(copyFrom);
      const other = draftOf(content);
      // added disclaimers get new ids here so the two programs stay separate
      other.notices = other.notices.map((n) => (n.builtIn ? n : { ...n, key: newKey() }));
      setDraft(other);
      setCopyFrom("");
      toast.success(`Copied ${name}'s pages and disclaimers — check them, then Save changes.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load that program's text.");
    }
  };

  const discard = async () => {
    const ok = await confirmDialog({
      title: "Discard unsaved changes?",
      message: "Everything goes back to the last saved version.",
      confirmLabel: "Discard",
      tone: "danger",
    });
    if (!ok) return;
    setDraft(draftOf(loaded));
  };

  const save = async () => {
    const err = validate(draft);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    setConflict("");
    try {
      const content = await saveLegalContent(selectedProgramId, { ...payloadOf(draft), version: loaded.version });
      setLoaded(content);
      setDraft(draftOf(content));
      toast.success(`Saved — ${selectedProgram?.label || "the program"}'s website shows the new text within a minute.`);
    } catch (e) {
      const msg = e?.response?.data?.message || "Couldn't save. Please try again.";
      if (e?.response?.status === 409) setConflict(msg);
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ---------- render ----------
  const header = (
    <AdminPageHeader
      title="Legal & Disclaimers"
      subtitle={`Privacy Policy, Terms of Use and every disclaimer on ${selectedProgram?.label || "this program"}'s website.`}
    />
  );

  if (loadError) {
    return (
      <div className="space-y-6">
        {header}
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-600">{loadError}</p>
          <button type="button" onClick={() => load(selectedProgramId)} className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      </div>
    );
  }

  const brand = loaded.brand;
  const offCount = draft.notices.filter((n) => !n.enabled).length;

  return (
    <div className={`space-y-6 ${dirty ? "pb-24" : ""}`}>
      {header}

      {/* status + tools */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <Info size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {draft.notices.length - offCount} disclaimer{draft.notices.length - offCount === 1 ? "" : "s"} shown
              {offCount > 0 && <span className="font-normal text-gray-500"> · {offCount} off</span>}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {loaded.isOriginal
                ? "Using the original text — never changed for this program."
                : `Last saved${loaded.updatedByName ? ` by ${loaded.updatedByName}` : ""}${loaded.updatedAt ? ` on ${formatUtcDate(loaded.updatedAt)}` : ""}.`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            aria-label="Copy pages and disclaimers from another program"
            className={`${inputCls} flex-1 sm:w-48`}
            value={copyFrom}
            onChange={(e) => setCopyFrom(e.target.value)}
          >
            <option value="">Copy from program…</option>
            {AVAILABLE_PROGRAMS.filter((p) => p.id !== selectedProgramId).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={doCopy}
            disabled={!copyFrom}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Copy size={14} /> Copy
          </button>
        </div>
      </div>

      {conflict && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-900 flex-1">{conflict}</p>
          <button type="button" onClick={() => load(selectedProgramId)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700">
            Reload latest
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-5">
        {/* tabs + tab tools */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div role="tablist" aria-label="Legal content" className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 self-start overflow-x-auto max-w-full">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  setPreview(false);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap transition-colors ${
                  tab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {t.label}
                {t.id === "notices" && <span className="ml-1 text-xs text-gray-400">({draft.notices.length})</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-2 md:ml-auto">
            {tab !== "notices" && (
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                aria-pressed={preview}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                {preview ? <EyeOff size={14} /> : <Eye size={14} />} {preview ? "Back to editing" : "Preview"}
              </button>
            )}
            <button
              type="button"
              onClick={resetTab}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <RotateCcw size={14} /> Reset to original
            </button>
          </div>
        </div>

        <TokenHelp />

        {/* ---------- Privacy Policy ---------- */}
        {tab === "privacy" &&
          (preview ? (
            <PagePreview page={draft.privacy} brand={brand} />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Page title">
                  <input className={`${inputCls} w-full`} maxLength={80} value={draft.privacy.title} onChange={(e) => setPage("privacy", { title: e.target.value })} />
                </Field>
                <Field label="Last updated" hint="Moves to today when you save a change to this page.">
                  <p className="text-sm text-gray-700 py-2">{formatLegalDate(loaded.privacy.lastUpdated) || "—"}</p>
                </Field>
              </div>
              <SectionsEditor sections={draft.privacy.sections} onChange={(sections) => setPage("privacy", { sections })} />
            </div>
          ))}

        {/* ---------- Terms of Use ---------- */}
        {tab === "terms" &&
          (preview ? (
            <PagePreview page={draft.terms} brand={brand} accent />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Heading">
                  <input className={`${inputCls} w-full`} maxLength={80} value={draft.terms.title} onChange={(e) => setPage("terms", { title: e.target.value })} />
                </Field>
                <Field label="Heading — coloured part" hint="Shown after the heading in the accent colour. Optional.">
                  <input className={`${inputCls} w-full`} maxLength={80} value={draft.terms.titleAccent} onChange={(e) => setPage("terms", { titleAccent: e.target.value })} />
                </Field>
              </div>
              <Field label="Subtitle" hint="Optional.">
                <input className={`${inputCls} w-full`} maxLength={300} value={draft.terms.subtitle} onChange={(e) => setPage("terms", { subtitle: e.target.value })} />
              </Field>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-3">
                <p className="text-xs font-bold text-gray-700">Highlight box (leave both empty to hide it)</p>
                <Field label="Title">
                  <input className={`${inputCls} w-full`} maxLength={120} value={draft.terms.highlightTitle} onChange={(e) => setPage("terms", { highlightTitle: e.target.value })} />
                </Field>
                <Field label="Text">
                  <textarea
                    className={`${inputCls} w-full resize-y`}
                    maxLength={1000}
                    rows={rowsFor(draft.terms.highlightText, 2, 6)}
                    value={draft.terms.highlightText}
                    onChange={(e) => setPage("terms", { highlightText: e.target.value })}
                  />
                </Field>
              </div>
              <p className="text-xs text-gray-500">
                Last updated: <span className="font-semibold text-gray-700">{formatLegalDate(loaded.terms.lastUpdated) || "—"}</span> — moves to today
                when you save a change to this page.
              </p>
              <SectionsEditor sections={draft.terms.sections} onChange={(sections) => setPage("terms", { sections })} />
            </div>
          ))}

        {/* ---------- Disclaimers ---------- */}
        {tab === "notices" && (
          <div className="space-y-6">
            {PLACEMENTS.map((pl) => {
              const builtIns = draft.notices.filter((n) => n.builtIn && n.placement === pl.id);
              const added = draft.notices.filter((n) => !n.builtIn && n.placement === pl.id);
              return (
                <section key={pl.id} aria-label={pl.label}>
                  <div className="flex items-end justify-between gap-3 mb-2">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">{pl.label}</h2>
                      <p className="text-xs text-gray-500">{pl.hint}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addNotice(pl.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex-shrink-0"
                    >
                      <Plus size={13} /> Add disclaimer
                    </button>
                  </div>
                  {pl.id === "booking_checkout" && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                      The booking rules should match how bookings really work (reschedule up to 48 hours before, no refund when the patient
                      cancels, free credit when the doctor cancels). Changing this text doesn't change those rules.
                    </p>
                  )}
                  <div className="space-y-2">
                    {[...builtIns, ...added].map((n) => (
                      <NoticeCard
                        key={n.key}
                        n={n}
                        brand={brand}
                        first={!n.builtIn && added[0]?.key === n.key}
                        last={!n.builtIn && added[added.length - 1]?.key === n.key}
                        onChange={(patch) => setNotice(n.key, patch)}
                        onMove={(dir) => moveNotice(n.key, dir)}
                        onDelete={() => deleteNotice(n)}
                      />
                    ))}
                    {!builtIns.length && !added.length && (
                      <p className="text-xs text-gray-400 rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center">
                        Nothing here yet.
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* save bar */}
      {dirty && (
        <div className="fixed bottom-0 inset-x-0 lg:left-[260px] z-[60] bg-white/95 backdrop-blur border-t border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 shadow-[0_-4px_16px_rgba(16,24,40,0.06)]">
          <p className="text-sm text-gray-700 sm:flex-1">
            <span className="font-semibold">Unsaved changes</span>
            <span className="text-gray-500"> — the website still shows the old text until you save.</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={discard} disabled={saving} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Discard
            </button>
            <button type="button" onClick={save} disabled={saving} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalContentEditor;
