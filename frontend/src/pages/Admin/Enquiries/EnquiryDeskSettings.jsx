/**
 * ADMIN MODULE — Enquiry desk settings (super admin)
 *
 *  - Working hours, days, time zone and holidays (the clock for time limits)
 *  - Time limits per priority (first reply, resolve)
 *  - Queue: auto-assign on/off, max open enquiries per admin, warning point
 *  - Automation: reminder to quiet customers, auto-close, daily digest
 *  - Ready replies: saved answers admins insert into replies
 * Route: /admin/enquiries/settings
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Plus, Trash2, Pencil, X, Zap, Sparkles, PlugZap, CheckCircle2, CircleDashed } from "lucide-react";
import toast from "react-hot-toast";
import {
  getEnquiryDeskSetup,
  saveEnquiryDeskSettings,
  listReadyReplies,
  createReadyReply,
  updateReadyReply,
  deleteReadyReply,
} from "../../../services/adminEnquiryService";
import { CATEGORIES, PRIORITY } from "./enquiryUi";
import { confirmDialog } from "../../../utils/confirmDialog";

const card = "bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)]";
const input =
  "w-full min-w-0 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// minutes ⇄ a value + unit the admin understands
const UNITS = { min: 1, h: 60, d: 0 }; // "d" = working days (= length of one working day)
const toParts = (minutes, dayLen) => {
  if (minutes % dayLen === 0 && minutes >= dayLen) return { value: minutes / dayLen, unit: "d" };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: "h" };
  return { value: minutes, unit: "min" };
};
const toMinutes = ({ value, unit }, dayLen) => Math.round(Number(value) * (unit === "d" ? dayLen : UNITS[unit]));

const hm = (s) => {
  const [h, m] = String(s || "").split(":").map(Number);
  return h * 60 + m;
};

const Field = ({ label, hint, children }) => (
  <div className="min-w-0">
    <p className="text-xs font-semibold text-gray-600 mb-1.5">{label}</p>
    {children}
    {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

const TIMEZONES = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Kolkata", "UTC"];
  }
})();

const EnquiryDeskSettings = () => {
  const [form, setForm] = useState(null);
  const [limits, setLimits] = useState(null); // { high: {first:{value,unit}, resolve:{...}}, ... }
  const [saving, setSaving] = useState(false);
  const [holiday, setHoliday] = useState("");
  const [replies, setReplies] = useState([]);
  const [editing, setEditing] = useState(null); // { _id?, title, body, category, isActive }
  const [savingReply, setSavingReply] = useState(false);
  const [connections, setConnections] = useState(null);
  const [advanced, setAdvanced] = useState(false); // priorities + time limits switched on (server)

  const dayLen = form ? Math.max(60, hm(form.workEnd) - hm(form.workStart)) : 600;

  useEffect(() => {
    getEnquiryDeskSetup()
      .then(({ settings: s, connections: c, features: f }) => {
        setConnections(c || null);
        setAdvanced(f?.advanced === true);
        setForm(s);
        const len = Math.max(60, hm(s.workEnd) - hm(s.workStart));
        setLimits(
          Object.fromEntries(
            ["high", "normal", "low"].map((p) => [p, { first: toParts(s.sla[p].firstReply, len), resolve: toParts(s.sla[p].resolve, len) }])
          )
        );
      })
      .catch((err) => toast.error(err?.response?.data?.message || "Failed to load settings"));
    listReadyReplies({ all: true })
      .then(setReplies)
      .catch(() => {});
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setLimit = (p, which, part, value) => setLimits((l) => ({ ...l, [p]: { ...l[p], [which]: { ...l[p][which], [part]: value } } }));

  const save = async () => {
    if (saving || !form) return;
    try {
      setSaving(true);
      const payload = {
        ...form,
        sla: Object.fromEntries(
          ["high", "normal", "low"].map((p) => [p, { firstReply: toMinutes(limits[p].first, dayLen), resolve: toMinutes(limits[p].resolve, dayLen) }])
        ),
      };
      delete payload.updatedAt;
      const saved = await saveEnquiryDeskSettings(payload);
      setForm(saved);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save settings");
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday)) return toast.error("Pick a date first");
    if (form.holidays.includes(holiday)) return toast.error("That date is already a holiday");
    set("holidays", [...form.holidays, holiday].sort());
    setHoliday("");
  };

  const saveReply = async () => {
    if (savingReply || !editing) return;
    try {
      setSavingReply(true);
      const body = { title: editing.title, body: editing.body, category: editing.category, isActive: editing.isActive !== false };
      const t = editing._id ? await updateReadyReply(editing._id, body) : await createReadyReply(body);
      setReplies((list) => (editing._id ? list.map((x) => (x._id === t._id ? t : x)) : [...list, t]));
      setEditing(null);
      toast.success(editing._id ? "Ready reply saved" : "Ready reply added");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save the ready reply");
    } finally {
      setSavingReply(false);
    }
  };

  const removeReply = async (t) => {
    const ok = await confirmDialog({
      title: "Delete this ready reply?",
      message: `“${t.title}” will be removed for every admin.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteReadyReply(t._id);
      setReplies((list) => list.filter((x) => x._id !== t._id));
      toast.success("Ready reply deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't delete it");
    }
  };

  if (!form || !limits) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        <div className={`${card} h-96 animate-pulse`} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <Link to="/admin/enquiries" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600">
        <ArrowLeft size={16} /> Back to Enquiries
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enquiry desk settings</h1>
        <p className="text-sm text-gray-500">
          {advanced
            ? "Working hours, time limits, the queue and automatic emails. Changes apply to new enquiries; enquiries already open keep their deadlines."
            : "The queue, automatic emails, AI drafts and ready replies."}
        </p>
      </div>

      {/* WORKING HOURS + TIME LIMITS (only with priorities / time limits switched on) */}
      {advanced && (
      <>
      <div className={`${card} p-5 space-y-4`}>
        <h2 className="text-sm font-bold text-gray-900">Working hours</h2>
        <p className="text-xs text-gray-500 -mt-2">Time limits only count time inside these hours — an enquiry sent at night isn't late by morning.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Time zone">
            <select aria-label="Time zone" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className={input}>
              {[...new Set([form.timezone, "Asia/Kolkata", "UTC", ...TIMEZONES])].map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Opens at">
            <input type="time" aria-label="Opens at" value={form.workStart} onChange={(e) => set("workStart", e.target.value)} className={input} />
          </Field>
          <Field label="Closes at">
            <input type="time" aria-label="Closes at" value={form.workEnd} onChange={(e) => set("workEnd", e.target.value)} className={input} />
          </Field>
        </div>
        <Field label="Working days">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const on = form.workDays.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("workDays", on ? form.workDays.filter((x) => x !== i) : [...form.workDays, i].sort())}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${on ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-500"}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Holidays" hint="The clock doesn't run on these dates.">
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="date" aria-label="Holiday date" value={holiday} onChange={(e) => setHoliday(e.target.value)} className={`${input} sm:w-48`} />
            <button type="button" onClick={addHoliday} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
              <Plus size={14} /> Add holiday
            </button>
          </div>
          {form.holidays.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.holidays.map((h) => (
                <span key={h} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-700">
                  {h}
                  <button type="button" aria-label={`Remove ${h}`} onClick={() => set("holidays", form.holidays.filter((x) => x !== h))} className="text-gray-400 hover:text-red-600">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>
      </div>

      {/* TIME LIMITS */}
      <div className={`${card} p-5 space-y-3`}>
        <h2 className="text-sm font-bold text-gray-900">Time limits</h2>
        <p className="text-xs text-gray-500 -mt-1">
          Counted in working time. 1 working day = {Math.round((dayLen / 60) * 10) / 10} hours. Priority is set automatically: payment, refund and subscription questions and paying customers are High; feedback is Low.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-2 pr-3">Priority</th>
                <th className="py-2 pr-3">First reply within</th>
                <th className="py-2">Resolve within</th>
              </tr>
            </thead>
            <tbody>
              {["high", "normal", "low"].map((p) => (
                <tr key={p} className="border-t border-gray-50">
                  <td className="py-2 pr-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${PRIORITY[p].cls}`}>{PRIORITY[p].label}</span>
                  </td>
                  {["first", "resolve"].map((which) => (
                    <td key={which} className="py-2 pr-3">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          aria-label={`${PRIORITY[p].label} ${which === "first" ? "first reply" : "resolve"} amount`}
                          value={limits[p][which].value}
                          onChange={(e) => setLimit(p, which, "value", e.target.value)}
                          className={`${input} w-24`}
                        />
                        <select
                          aria-label={`${PRIORITY[p].label} ${which === "first" ? "first reply" : "resolve"} unit`}
                          value={limits[p][which].unit}
                          onChange={(e) => setLimit(p, which, "unit", e.target.value)}
                          className={`${input} w-40`}
                        >
                          <option value="min">minutes</option>
                          <option value="h">working hours</option>
                          <option value="d">working days</option>
                        </select>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* QUEUE */}
      <div className={`${card} p-5 space-y-4`}>
        <h2 className="text-sm font-bold text-gray-900">Queue</h2>
        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer">
          <input type="checkbox" checked={form.autoAssign} onChange={(e) => set("autoAssign", e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
          <span className="text-sm text-gray-800">
            Auto-assign new enquiries
            <span className="block text-xs text-gray-500 mt-0.5">
              Each new enquiry goes to the Available admin with the fewest open enquiries. Off: admins press “Take next”. Super admins are never auto-assigned.
            </span>
          </span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Most open enquiries per admin" hint="Admins at this number can't take more until they resolve some.">
            <input type="number" min="1" max="500" aria-label="Most open enquiries per admin" value={form.maxOpenPerAdmin} onChange={(e) => set("maxOpenPerAdmin", e.target.value)} className={input} />
          </Field>
          {advanced && (
            <Field label="Warn the owner at (% of the time limit)" hint="e.g. 75 → a 4-hour limit warns after 3 working hours.">
              <input type="number" min="10" max="95" aria-label="Warning point percent" value={form.warnAtPercent} onChange={(e) => set("warnAtPercent", e.target.value)} className={input} />
            </Field>
          )}
        </div>
      </div>

      {/* AUTOMATION */}
      <div className={`${card} p-5 space-y-4`}>
        <h2 className="text-sm font-bold text-gray-900">Automatic emails</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Remind a quiet customer after (hours)" hint="When we're waiting on the customer, one “do you still need help?” email.">
            <input type="number" min="1" max="720" aria-label="Reminder after hours" value={form.nudgeAfterHours} onChange={(e) => set("nudgeAfterHours", e.target.value)} className={input} />
          </Field>
          <Field label="Close after (days without an answer)" hint="Resolved enquiries close, and reminded customers who stay quiet are resolved.">
            <input type="number" min="1" max="60" aria-label="Auto close days" value={form.autoCloseDays} onChange={(e) => set("autoCloseDays", e.target.value)} className={input} />
          </Field>
        </div>
        {advanced && (
        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer">
          <input type="checkbox" checked={form.digestEnabled} onChange={(e) => set("digestEnabled", e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
          <span className="text-sm text-gray-800 flex-1">
            Daily digest email to super admins
            <span className="block text-xs text-gray-500 mt-0.5">Yesterday's numbers, what's late, and the oldest open enquiries.</span>
          </span>
          <select
            aria-label="Digest hour"
            value={form.digestHour}
            disabled={!form.digestEnabled}
            onChange={(e) => set("digestHour", Number(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
        )}
      </div>

      {/* AI + CONNECTIONS */}
      <div className={`${card} p-5 space-y-4`}>
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <Sparkles size={15} className="text-fuchsia-500" /> AI reply drafts
        </h2>
        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer">
          <input type="checkbox" checked={!!form.aiDrafts} onChange={(e) => set("aiDrafts", e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
          <span className="text-sm text-gray-800">
            Let admins ask the AI for a draft reply
            <span className="block text-xs text-gray-500 mt-0.5">
              The AI suggests a reply from the conversation and your ready replies; the admin always reads and edits it before sending. Email addresses and phone numbers are removed before anything is sent to the AI.
            </span>
            {form.aiDrafts && connections && !connections.ai && (
              <span className="block text-xs text-amber-700 mt-1">The server has no AI key yet (ANTHROPIC_API_KEY), so the button stays hidden until it's added.</span>
            )}
          </span>
        </label>

        {connections && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
              <PlugZap size={13} /> Connections (set up on the server)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                // WhatsApp only listed when it's switched on for enquiries
                ...("whatsapp" in connections ? [["WhatsApp messages", connections.whatsapp, "Replies marked “Also send on WhatsApp” are recorded until a WhatsApp provider is connected."]] : []),
                ["Customers reply by email", connections.replyByEmail, "Until connected, customers answer through the private link in our emails."],
                ["Masked calling", connections.calls, "“Call customer” is recorded but not placed until a calling provider is connected."],
                ["AI drafts", connections.ai, "Needs an AI key on the server."],
              ].map(([label, on, hint]) => (
                <div key={label} className="flex items-start gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                  {on ? <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" /> : <CircleDashed size={16} className="text-gray-400 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {label} <span className={`text-xs font-semibold ${on ? "text-emerald-700" : "text-gray-500"}`}>{on ? "Connected" : "Not connected"}</span>
                    </p>
                    {!on && <p className="text-xs text-gray-500">{hint}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* READY REPLIES */}
      <div className={`${card} p-5 space-y-3`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Zap size={15} className="text-indigo-500" /> Ready replies
            </h2>
            <p className="text-xs text-gray-500">
              Saved answers admins insert into a reply and edit. Use {"{name}"}, {"{ticket}"} and {"{program}"} — they're filled in automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing({ title: "", body: "", category: "", isActive: true })}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {editing && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Title">
                <input aria-label="Ready reply title" value={editing.title} maxLength={80} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={input} placeholder="e.g. How to reschedule" />
              </Field>
              <Field label="Category (suggested first for these enquiries)">
                <select aria-label="Ready reply category" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={input}>
                  <option value="">Any</option>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Reply text">
              <textarea
                aria-label="Ready reply text"
                rows={5}
                maxLength={5000}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                className={`${input} resize-y`}
                placeholder={"Hi {name},\n\nYou can reschedule from My Appointments…"}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={editing.isActive !== false} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
              Show to admins
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200">
                Cancel
              </button>
              <button type="button" onClick={saveReply} disabled={savingReply} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
                {savingReply && <Loader2 size={14} className="animate-spin" />} Save ready reply
              </button>
            </div>
          </div>
        )}

        {replies.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No ready replies yet.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {replies.map((t) => (
              <li key={t._id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {t.title}
                    {!t.isActive && <span className="ml-2 text-[11px] font-normal text-gray-400">hidden</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {t.category ? CATEGORIES[t.category] : "Any category"} · used {t.useCount || 0}× · {t.body}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" aria-label={`Edit ${t.title}`} onClick={() => setEditing({ ...t })} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                    <Pencil size={14} />
                  </button>
                  <button type="button" aria-label={`Delete ${t.title}`} onClick={() => removeReply(t)} className="p-2 rounded-lg text-red-500 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* SAVE BAR */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-[260px] z-30 bg-white/95 backdrop-blur border-t border-gray-100 px-4 sm:px-8 py-3 flex items-center justify-end gap-3">
        <span className="text-xs text-gray-400 hidden sm:inline">Saving checks every value — anything wrong is explained.</span>
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save settings
        </button>
      </div>
    </div>
  );
};

export default EnquiryDeskSettings;
