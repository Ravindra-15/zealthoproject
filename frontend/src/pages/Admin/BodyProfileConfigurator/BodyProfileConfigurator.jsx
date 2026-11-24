/**
 * ============================================
 * ADMIN MODULE — Body Profile settings (super admin)
 * ============================================
 * The points patients fill in on the program picked in the sidebar:
 * the 3 step titles, sections (title, step, icon, colour, order) and every
 * point (name, type, unit, range, colour bands, options, order, hidden).
 *
 * - Each program has its own list; a program never edited uses the
 *   original 27 points.
 * - The 27 built-in points can be edited, moved and hidden, not deleted.
 *   Added points can be deleted until patients have answered them.
 * - Changes are made here first and only go live on "Save changes".
 *   Two admins saving at once can't overwrite each other.
 *
 * Route: /admin/body-profile   ·   Access: Super Admin only
 * ============================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  Loader2,
  Info,
  AlertTriangle,
  Activity,
} from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { useSelectedProgram, AVAILABLE_PROGRAMS } from "../../../context/SelectedProgramContext";
import { SECTION_ICONS } from "../../../components/customer/BodyProfile/bodyProfileIcons";
import { getBodyProfileConfig, saveBodyProfileConfig } from "../../../services/adminBodyProfileConfigService";
import { clearBodyProfileConfigCache } from "../../../services/bodyProfileConfigService";
import { defaultBodyProfileConfig, isBuiltInKey } from "../../../utils/bodyProfileConfig";
import { formatUtcDate } from "../../../utils/time";
import PointEditorModal from "./components/PointEditorModal";
import {
  TYPE_LABELS,
  ICON_KEYS,
  STEP_OPTIONS,
  MAX_SECTIONS,
  MAX_POINTS,
  MAX_POINTS_PER_SECTION,
  newPoint,
  newSectionKey,
  validateConfig,
  cleanForSave,
  pointSummary,
} from "./configEditor";

const copyOf = (cfg) => ({ steps: JSON.parse(JSON.stringify(cfg.steps)), sections: JSON.parse(JSON.stringify(cfg.sections)) });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const move = (arr, i, d) => {
  const out = [...arr];
  [out[i], out[i + d]] = [out[i + d], out[i]];
  return out;
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

// one point row
const PointRow = ({ p, first, last, onEdit, onToggle, onUp, onDown, onDelete }) => {
  const builtIn = isBuiltInKey(p.key);
  return (
    <li className={`flex items-center gap-2 sm:gap-3 rounded-xl border px-3 py-2.5 ${p.hidden ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200"}`}>
      <div className="flex flex-col -my-1">
        <IconBtn label="Move up" onClick={onUp} disabled={first}><ArrowUp size={13} /></IconBtn>
        <IconBtn label="Move down" onClick={onDown} disabled={last}><ArrowDown size={13} /></IconBtn>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold break-words ${p.hidden ? "text-gray-400 line-through" : "text-gray-900"}`}>{p.label}</p>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{TYPE_LABELS[p.type]}</span>
          {builtIn ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Built-in</span>
          ) : (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Added</span>
          )}
          {p.hidden && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Hidden</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          {p.type === "range" &&
            (p.zones || []).map((z, i) => (
              <span key={i} className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} title={z.label} />
            ))}
          <p className="text-xs text-gray-500 truncate">{pointSummary(p)}</p>
        </div>
      </div>
      <IconBtn label={p.hidden ? "Show to patients" : "Hide from patients"} onClick={onToggle}>
        {p.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
      </IconBtn>
      <IconBtn label={`Edit ${p.label}`} onClick={onEdit}><Pencil size={15} /></IconBtn>
      <IconBtn label={builtIn ? "Built-in points can't be deleted — hide it instead" : `Delete ${p.label}`} onClick={onDelete} disabled={builtIn} danger>
        <Trash2 size={15} />
      </IconBtn>
    </li>
  );
};

const BodyProfileConfigurator = () => {
  const { selectedProgramId, selectedProgram, selectProgram } = useSelectedProgram();

  const [loaded, setLoaded] = useState(null); // config as on the server
  const [draft, setDraft] = useState(null); // { steps, sections } being edited
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState("");
  const [editing, setEditing] = useState(null); // { sectionKey, point, isSaved }
  const [copyFrom, setCopyFrom] = useState("");

  const loadedFor = useRef(null); // program the draft belongs to
  const reqRef = useRef(0); // only the latest load counts
  const dirty = !!(loaded && draft && !same(cleanForSave(draft), cleanForSave(copyOf(loaded))));
  const dirtyRef = useRef(false);
  // kept in step for the program-switch check below (runs before it)
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
      const cfg = await getBodyProfileConfig(programId);
      if (req !== reqRef.current) return;
      loadedFor.current = programId;
      setLoaded(cfg);
      setDraft(copyOf(cfg));
    } catch (err) {
      if (req !== reqRef.current) return;
      setLoadError(err?.response?.data?.message || "Couldn't load the body profile settings.");
    }
  }, []);

  // program picked in the sidebar → its list (asks first if there are unsaved changes)
  useEffect(() => {
    if (loadedFor.current === selectedProgramId) return;
    if (dirtyRef.current && loadedFor.current) {
      const prevName = AVAILABLE_PROGRAMS.find((p) => p.id === loadedFor.current)?.label || "this program";
      if (!window.confirm(`Discard your unsaved body profile changes for ${prevName}?`)) {
        selectProgram(loadedFor.current);
        return;
      }
    }
    load(selectedProgramId);
  }, [selectedProgramId, load, selectProgram]);

  // closing / reloading the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const counts = useMemo(() => {
    const pts = (draft?.sections || []).flatMap((s) => s.points);
    return { total: pts.length, shown: pts.filter((p) => !p.hidden).length, hidden: pts.filter((p) => p.hidden).length };
  }, [draft]);

  // ---------- edits (all on the draft) ----------
  const setSections = (fn) => setDraft((d) => ({ ...d, sections: fn(d.sections) }));
  const setSection = (key, patch) => setSections((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const setPoints = (key, fn) => setSections((ss) => ss.map((s) => (s.key === key ? { ...s, points: fn(s.points) } : s)));
  const setStep = (id, patch) => setDraft((d) => ({ ...d, steps: d.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const savedKeys = useMemo(
    () => new Set((loaded?.sections || []).flatMap((s) => s.points.map((p) => p.key))),
    [loaded]
  );

  const addSection = () => {
    if (draft.sections.length >= MAX_SECTIONS) {
      toast.error(`At most ${MAX_SECTIONS} sections.`);
      return;
    }
    setSections((ss) => [...ss, { key: newSectionKey(), title: "New section", step: 3, icon: "activity", color: "#6366F1", points: [] }]);
  };

  const addPoint = (sectionKey) => {
    const s = draft.sections.find((x) => x.key === sectionKey);
    if (s.points.length >= MAX_POINTS_PER_SECTION) return toast.error(`At most ${MAX_POINTS_PER_SECTION} points per section.`);
    if (counts.total >= MAX_POINTS) return toast.error(`At most ${MAX_POINTS} points in total.`);
    setEditing({ sectionKey, point: newPoint("range"), isSaved: false });
    return undefined;
  };

  const applyPoint = (point, toSection) => {
    const { sectionKey } = editing;
    setSections((ss) => {
      const exists = ss.some((s) => s.points.some((p) => p.key === point.key));
      if (exists && sectionKey === toSection) {
        return ss.map((s) => (s.key === toSection ? { ...s, points: s.points.map((p) => (p.key === point.key ? point : p)) } : s));
      }
      // new point, or moved to another section (goes to the end there)
      return ss.map((s) => {
        const without = s.points.filter((p) => p.key !== point.key);
        return s.key === toSection ? { ...s, points: [...without, point] } : { ...s, points: without };
      });
    });
    setEditing(null);
  };

  const deletePoint = (sectionKey, p) => {
    if (isBuiltInKey(p.key)) return;
    const saved = savedKeys.has(p.key);
    const msg = saved
      ? `Delete “${p.label}”? If patients already answered it, saving will be refused — hide it instead to keep their answers.`
      : `Remove “${p.label}”?`;
    if (!window.confirm(msg)) return;
    setPoints(sectionKey, (pts) => pts.filter((x) => x.key !== p.key));
  };

  const deleteSection = (s) => {
    if (s.points.length) return;
    setSections((ss) => ss.filter((x) => x.key !== s.key));
  };

  const doCopy = async () => {
    if (!copyFrom) return;
    const name = AVAILABLE_PROGRAMS.find((p) => p.id === copyFrom)?.label || copyFrom;
    if (dirty && !window.confirm(`Replace your unsaved changes with ${name}'s list?`)) return;
    try {
      const other = await getBodyProfileConfig(copyFrom);
      setDraft(copyOf(other));
      setCopyFrom("");
      toast.success(`Copied ${name}'s list — check it, then Save changes.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load that program's list.");
    }
  };

  const doReset = () => {
    if (!window.confirm("Go back to the original 27 points? Points you added are kept but hidden. Nothing changes until you Save changes.")) return;
    const def = defaultBodyProfileConfig(selectedProgramId);
    const added = draft.sections.flatMap((s) => s.points).filter((p) => !isBuiltInKey(p.key)).map((p) => ({ ...p, hidden: true }));
    const sections = def.sections;
    if (added.length) {
      sections.push({ key: newSectionKey(), title: "Added points", step: 3, icon: "activity", color: "#6366F1", points: added });
    }
    setDraft({ steps: def.steps, sections });
  };

  const discard = () => {
    if (!window.confirm("Discard all unsaved changes?")) return;
    setDraft(copyOf(loaded));
  };

  const save = async () => {
    const payload = cleanForSave(draft);
    const err = validateConfig(payload);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    setConflict("");
    try {
      const cfg = await saveBodyProfileConfig(selectedProgramId, { ...payload, version: loaded.version });
      clearBodyProfileConfigCache();
      setLoaded(cfg);
      setDraft(copyOf(cfg));
      toast.success(`Saved — ${selectedProgram?.label || "the program"}'s patients see the new list now.`);
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
      title="Body Profile Points"
      subtitle={`What ${selectedProgram?.label || "this program"}'s patients fill in — names, units, ranges, colour bands and options.`}
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

  return (
    <div className={`space-y-6 ${dirty ? "pb-24" : ""}`}>
      {header}

      {/* status + tools */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <Info size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {counts.shown} point{counts.shown === 1 ? "" : "s"} shown to patients
              {counts.hidden > 0 && <span className="font-normal text-gray-500"> · {counts.hidden} hidden</span>}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {loaded.isDefault
                ? "Using the original 27 points — never changed for this program."
                : `Last saved${loaded.updatedByName ? ` by ${loaded.updatedByName}` : ""}${loaded.updatedAt ? ` on ${formatUtcDate(loaded.updatedAt)}` : ""}.`}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex gap-2">
            <select aria-label="Copy the list from another program" className={`${inputCls} flex-1 sm:w-48`} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <option value="">Copy from program…</option>
              {AVAILABLE_PROGRAMS.filter((p) => p.id !== selectedProgramId).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <button type="button" onClick={doCopy} disabled={!copyFrom} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              <Copy size={14} /> Copy
            </button>
          </div>
          <button type="button" onClick={doReset} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">
            <RotateCcw size={14} /> Reset to original
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

      {/* the 3 steps */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
        <h2 className="text-sm font-bold text-gray-900">Form steps</h2>
        <p className="text-xs text-gray-500 mt-0.5 mb-4">The patient fills the profile in 3 steps. A step with no visible points is skipped.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {draft.steps.map((st) => (
            <div key={st.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Step {st.id}</p>
              <input aria-label={`Step ${st.id} title`} className={`${inputCls} w-full`} maxLength={40} value={st.title} onChange={(e) => setStep(st.id, { title: e.target.value })} placeholder="Title" />
              <input aria-label={`Step ${st.id} description`} className={`${inputCls} w-full`} maxLength={80} value={st.subtitle} onChange={(e) => setStep(st.id, { subtitle: e.target.value })} placeholder="Short description" />
            </div>
          ))}
        </div>
      </div>

      {/* sections */}
      {draft.sections.map((s, si) => {
        const Icon = SECTION_ICONS[s.icon] || Activity;
        return (
          <section key={s.key} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}1A` }}>
                  <Icon size={17} style={{ color: s.color }} />
                </span>
                <input aria-label="Section title" className={`${inputCls} flex-1 min-w-0 font-semibold`} maxLength={60} value={s.title} onChange={(e) => setSection(s.key, { title: e.target.value })} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Step" className={inputCls} value={s.step} onChange={(e) => setSection(s.key, { step: Number(e.target.value) })}>
                  {STEP_OPTIONS.map((n) => (
                    <option key={n} value={n}>Step {n}</option>
                  ))}
                </select>
                <select aria-label="Icon" className={inputCls} value={s.icon} onChange={(e) => setSection(s.key, { icon: e.target.value })}>
                  {ICON_KEYS.map((k) => (
                    <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>
                  ))}
                </select>
                <input
                  type="color"
                  aria-label="Section colour"
                  value={s.color}
                  onChange={(e) => setSection(s.key, { color: e.target.value.toUpperCase() })}
                  className="w-10 h-10 rounded-lg border border-gray-200 bg-white p-0.5 cursor-pointer"
                />
                <IconBtn label="Move section up" onClick={() => setSections((ss) => move(ss, si, -1))} disabled={si === 0}><ArrowUp size={15} /></IconBtn>
                <IconBtn label="Move section down" onClick={() => setSections((ss) => move(ss, si, 1))} disabled={si === draft.sections.length - 1}><ArrowDown size={15} /></IconBtn>
                <IconBtn
                  label={s.points.length ? "Move or delete its points first" : "Delete section"}
                  onClick={() => deleteSection(s)}
                  disabled={s.points.length > 0 || draft.sections.length === 1}
                  danger
                >
                  <Trash2 size={15} />
                </IconBtn>
              </div>
            </div>

            {s.points.length ? (
              <ul className="space-y-2">
                {s.points.map((p, pi) => (
                  <PointRow
                    key={p.key}
                    p={p}
                    first={pi === 0}
                    last={pi === s.points.length - 1}
                    onEdit={() => setEditing({ sectionKey: s.key, point: p, isSaved: savedKeys.has(p.key) })}
                    onToggle={() => setPoints(s.key, (pts) => pts.map((x) => (x.key === p.key ? { ...x, hidden: !x.hidden } : x)))}
                    onUp={() => setPoints(s.key, (pts) => move(pts, pi, -1))}
                    onDown={() => setPoints(s.key, (pts) => move(pts, pi, 1))}
                    onDelete={() => deletePoint(s.key, p)}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 italic">No points yet — patients won't see this section.</p>
            )}

            <button type="button" onClick={() => addPoint(s.key)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline">
              <Plus size={15} /> Add point
            </button>
          </section>
        );
      })}

      <button
        type="button"
        onClick={addSection}
        className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm font-semibold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 inline-flex items-center justify-center gap-1.5"
      >
        <Plus size={16} /> Add section
      </button>

      {/* save bar */}
      {dirty && (
        <div className="fixed bottom-0 inset-x-0 lg:left-[260px] z-[60] bg-white/95 backdrop-blur border-t border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 shadow-[0_-4px_16px_rgba(16,24,40,0.06)]">
          <p className="text-sm text-gray-700 sm:flex-1">
            <span className="font-semibold">Unsaved changes</span>
            <span className="text-gray-500"> — patients still see the old list until you save.</span>
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

      {editing && (
        <PointEditorModal
          point={editing.point}
          isSaved={editing.isSaved}
          sections={draft.sections}
          sectionKey={editing.sectionKey}
          onApply={applyPoint}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

export default BodyProfileConfigurator;
