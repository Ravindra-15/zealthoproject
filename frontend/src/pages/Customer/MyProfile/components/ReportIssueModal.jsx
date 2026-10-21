/**
 * CUSTOMER MODULE — Report an Issue popup (profile page)
 */

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../../../../components/common/Modal";
import { reportIssue } from "../../../../services/issueReportService";

const PLATFORM = "zealtho";
const SUBJECT_MAX = 100;
const DESCRIPTION_MAX = 1000;
const CATEGORIES = [
  { value: "appointment", label: "Appointment / Consultation" },
  { value: "payment", label: "Payment / Billing" },
  { value: "videos", label: "Videos / Program" },
  { value: "account", label: "Account / Login" },
  { value: "other", label: "Something else" },
];

const inputCls =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent";

const ReportIssueModal = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = subject.trim().length >= 3 && description.trim().length >= 10 && !submitting;

  const close = () => {
    if (submitting) return;
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await reportIssue({ subject: subject.trim(), description: description.trim(), category, platform: PLATFORM });
      toast.success("Thanks! Your issue has been reported to our team.");
      setCategory("other");
      setSubject("");
      setDescription("");
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't send your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close}>
      <form onSubmit={handleSubmit}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Report an Issue</h2>
        <p className="text-xs text-gray-500 mb-4">
          Tell us what went wrong and our team will look into it.
        </p>

        <label className="block text-xs font-semibold text-gray-600 mb-1">What is it about?</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} bg-white mb-3`}>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
          placeholder="e.g. Video not playing"
          className={`${inputCls} mb-3`}
        />

        <label className="block text-xs font-semibold text-gray-600 mb-1">Describe the issue</label>
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
            rows={5}
            placeholder="What happened, and what were you trying to do?"
            className={`${inputCls} resize-none pb-6`}
          />
          <span className="absolute bottom-2 right-3 text-[11px] text-gray-400">
            {description.length}/{DESCRIPTION_MAX}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Submit Report
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReportIssueModal;
