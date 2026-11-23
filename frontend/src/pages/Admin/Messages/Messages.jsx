/**
 * ============================================
 * ADMIN MODULE — Messages (Broadcast)
 * ============================================
 * Admin/superadmin compose an announcement (title + rich-text body +
 * optional image) and email it to every customer of one program, or to
 * every doctor. Live preview updates in real time from form state — no
 * save/refresh needed to see it.
 *
 * Layout: two columns on desktop (compose left, live preview right,
 * sticky); single column on mobile (compose, then preview stacked right
 * below it — always visible, not behind a toggle).
 *
 * Route: /admin/messages
 * ============================================
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import DOMPurify from "dompurify";
import { Mail, Users, Stethoscope, Loader2, MessageCircle, Check } from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import MessageImageUploader from "./components/MessageImageUploader";
import MessagePreviewCard from "./components/MessagePreviewCard";
import ConfirmSendModal from "./components/ConfirmSendModal";
import MessageHistoryTable from "./components/MessageHistoryTable";
import { AVAILABLE_PROGRAMS } from "../../../context/SelectedProgramContext";
import {
  sendMessage,
  fetchRecipientCount,
  fetchMessages,
} from "../../../services/adminMessageService";

// 🚩 Mirrors backend/utils/messageConstants.js DOCTOR_MESSAGES_ENABLED —
// flip to false here too if that's ever disabled server-side, so the UI
// doesn't offer an option the backend will reject.
const DOCTOR_MESSAGES_ENABLED = true;

const PROGRAM_OPTIONS = AVAILABLE_PROGRAMS.filter((p) => p.id !== "zealtho");

const LIMITS = { TITLE_MAX: 150, BODY_MAX: 3000 };

const QUILL_MODULES = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};
const QUILL_FORMATS = ["bold", "italic", "underline", "list", "bullet", "link"];

const countVisibleChars = (html) => {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length;
};

const sanitizeHtml = (dirty) =>
  DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ol", "ul", "li", "a", "blockquote"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

const Messages = () => {
  const [audienceType, setAudienceType] = useState("customers");
  const [programId, setProgramId] = useState(PROGRAM_OPTIONS[0]?.id || "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState(null);

  // 📨 how to send — email and/or WhatsApp
  const [channels, setChannels] = useState({ email: true, whatsapp: true });
  const [counts, setCounts] = useState({ email: 0, whatsapp: 0, whatsappLive: false });
  const [countLoading, setCountLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // 🔢 Live recipient count — refetches whenever the audience changes
  useEffect(() => {
    let mounted = true;
    setCountLoading(true);
    fetchRecipientCount({ audienceType, programId })
      .then((c) => {
        if (mounted) setCounts(c);
      })
      .catch(() => {
        if (mounted) setCounts({ email: 0, whatsapp: 0, whatsappLive: false });
      })
      .finally(() => {
        if (mounted) setCountLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [audienceType, programId]);

  // 📋 Load sent history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchMessages({ page: 1, limit: 50 });
      setHistory(data.messages || []);
    } catch {
      // soft fail — history is secondary to composing
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const visibleBodyLength = useMemo(() => countVisibleChars(body), [body]);

  const chosenChannels = ["email", "whatsapp"].filter((c) => channels[c]);
  const toggleChannel = (c) => setChannels((prev) => ({ ...prev, [c]: !prev[c] }));
  // people reached on the chosen channels (Send is blocked at 0)
  const reachCount = (channels.email ? counts.email : 0) + (channels.whatsapp ? counts.whatsapp : 0);

  const audienceLabel =
    audienceType === "doctors"
      ? "all doctors"
      : `${PROGRAM_OPTIONS.find((p) => p.id === programId)?.label || programId} customers`;

  const validate = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (title.trim().length > LIMITS.TITLE_MAX) {
      toast.error(`Title cannot exceed ${LIMITS.TITLE_MAX} characters`);
      return false;
    }
    if (visibleBodyLength === 0) {
      toast.error("Body is required");
      return false;
    }
    if (visibleBodyLength > LIMITS.BODY_MAX) {
      toast.error(`Body cannot exceed ${LIMITS.BODY_MAX} characters`);
      return false;
    }
    if (chosenChannels.length === 0) {
      toast.error("Pick at least one way to send: Email or WhatsApp");
      return false;
    }
    return true;
  };

  const handleReviewClick = () => {
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    if (sending) return;
    try {
      setSending(true);
      const result = await sendMessage({
        title: title.trim(),
        body: sanitizeHtml(body),
        image,
        audienceType,
        programId,
        channels: chosenChannels,
      });
      toast.success(result.message || "Message sent");
      setConfirmOpen(false);
      // 🔄 Reset the form for the next message
      setTitle("");
      setBody("");
      setImage(null);
      loadHistory();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Messages"
        subtitle="Send an announcement by email and WhatsApp to your customers or doctors"
      />

      {/* ============================================ */}
      {/* ✍️ COMPOSE + LIVE PREVIEW                     */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT — Compose form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Mail size={18} className="text-indigo-500" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Compose Message</h2>
          </div>

          {/* Audience toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Send to</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAudienceType("customers")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                  audienceType === "customers"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Users size={16} />
                Customers
              </button>
              {DOCTOR_MESSAGES_ENABLED && (
                <button
                  type="button"
                  onClick={() => setAudienceType("doctors")}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                    audienceType === "doctors"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Stethoscope size={16} />
                  Doctors
                </button>
              )}
            </div>
          </div>

          {/* Program dropdown — customers only */}
          {audienceType === "customers" && (
            <div>
              <label htmlFor="programId" className="block text-sm font-medium text-gray-700 mb-2">
                Program
              </label>
              <select
                id="programId"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                {PROGRAM_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 📨 Send via — Email and/or WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Send via</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "email", label: "Email", Icon: Mail },
                { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="checkbox"
                  aria-checked={channels[id]}
                  onClick={() => toggleChannel(id)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                    channels[id]
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      channels[id] ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {channels[id] && <Check size={11} strokeWidth={3} />}
                  </span>
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
            {channels.whatsapp && !counts.whatsappLive && !countLoading && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                WhatsApp isn't connected yet — WhatsApp messages are recorded but won't reach phones until it's
                connected. Email works as usual.
              </p>
            )}
          </div>

          {/* Recipient count */}
          <p className="text-xs text-gray-500 -mt-2">
            {countLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Counting recipients...
              </span>
            ) : chosenChannels.length === 0 ? (
              <span className="text-red-600">Pick Email, WhatsApp or both.</span>
            ) : (
              <>
                This will reach{" "}
                {channels.email && (
                  <span className="font-semibold text-gray-700">
                    {counts.email} by email
                  </span>
                )}
                {channels.email && channels.whatsapp && " and "}
                {channels.whatsapp && (
                  <span className="font-semibold text-gray-700">
                    {counts.whatsapp} on WhatsApp
                  </span>
                )}
              </>
            )}
          </p>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={LIMITS.TITLE_MAX}
              placeholder="e.g., Happy Diwali!"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Body — rich text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body <span className="text-red-500">*</span>
            </label>
            <div className="quill-wrapper bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-colors">
              <ReactQuill
                theme="snow"
                value={body}
                onChange={setBody}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
                placeholder="Write your message..."
              />
            </div>
            <div className="mt-1.5 flex justify-end">
              <span className={`text-xs ${visibleBodyLength > LIMITS.BODY_MAX * 0.9 ? "text-orange-500" : "text-gray-400"}`}>
                {visibleBodyLength} / {LIMITS.BODY_MAX} characters
              </span>
            </div>
          </div>

          {/* Image attachment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image Attachment <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <MessageImageUploader value={image} onChange={setImage} />
          </div>

          <button
            type="button"
            onClick={handleReviewClick}
            className="w-full px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors"
          >
            Review & Send
          </button>
        </div>

        {/* RIGHT — Live preview (sticky on desktop, stacked on mobile) */}
        <div className="lg:sticky lg:top-6">
          <MessagePreviewCard title={title} bodyHtml={body} imageFile={image} />
        </div>
      </div>

      {/* ============================================ */}
      {/* 📋 SENT HISTORY                               */}
      {/* ============================================ */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">Sent History</h2>
        <MessageHistoryTable messages={history} loading={historyLoading} />
      </div>

      <ConfirmSendModal
        isOpen={confirmOpen}
        audienceLabel={audienceLabel}
        recipientCount={reachCount}
        emailCount={channels.email ? counts.email : null}
        whatsappCount={channels.whatsapp ? counts.whatsapp : null}
        whatsappLive={counts.whatsappLive}
        loading={sending}
        onConfirm={handleConfirmSend}
        onClose={() => !sending && setConfirmOpen(false)}
      />
    </div>
  );
};

export default Messages;
