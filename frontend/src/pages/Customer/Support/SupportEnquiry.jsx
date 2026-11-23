/**
 * CUSTOMER — My enquiry (private link from the email, no login)
 * Route: /support/enquiry/:ticketNo?t=<link key>
 *
 * Shows the customer's enquiry and our replies (never internal notes or
 * admin names), and lets them answer. Answering a resolved enquiry
 * reopens it; a closed one can't be answered (they're pointed to the
 * website to send a new one). Branded for the program they wrote to.
 */

import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Loader2, Send, CheckCircle2, Clock, Lock, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { fetchEnquiryThread, replyToEnquiryThread } from "../../../services/customerEnquiryService";
import { formatUtcDateTime12h } from "../../../utils/time";

const BRANDS = {
  zealtho: { name: "Zealtho", accent: "#EA580C", soft: "#FFF7ED" },
  yogat20: { name: "YogaT20", accent: "#EA580C", soft: "#FFF7ED" },
  diabmukt: { name: "Diabmukt", accent: "#4F46E5", soft: "#EEF2FF" },
  mommyfit: { name: "MommyFit", accent: "#C2547F", soft: "#FFF3F7" },
  slimfitter: { name: "Slimfitter", accent: "#4E4391", soft: "#F4F2FA" },
};

const MAX = 2000;

const STATUS_TEXT = {
  open: { icon: Clock, text: "Our team is working on it — we'll reply by email." },
  waiting: { icon: MessageSquare, text: "We're waiting for your answer — please reply below." },
  resolved: { icon: CheckCircle2, text: "Marked as resolved. Still need help? Reply below within 3 days and it will reopen." },
  closed: { icon: Lock, text: "This enquiry is closed." },
};

// page frame — outside the page component so typing never remounts it
const Shell = ({ brand, children }) => (
  <div className="min-h-screen bg-gray-50">
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <span className="text-lg font-bold" style={{ color: brand.accent }}>
          {brand.name}
        </span>
        <span className="text-xs text-gray-500">Support</span>
      </div>
    </header>
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">{children}</main>
  </div>
);

export default function SupportEnquiry() {
  const { ticketNo } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") || "";

  const [thread, setThread] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchEnquiryThread(ticketNo, token)
      .then((d) => mounted && setThread(d))
      .catch((err) => mounted && setError(err?.response?.data?.message || "We couldn't open this enquiry. Please try again."))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [ticketNo, token]);

  const brand = BRANDS[thread?.source] || BRANDS.zealtho;

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    try {
      setSending(true);
      const d = await replyToEnquiryThread(ticketNo, token, body);
      setThread(d);
      setText("");
      toast.success("Message sent — we'll reply by email.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't send your message. Please try again.");
      if (err?.response?.data?.code === "CLOSED") setThread((t) => (t ? { ...t, status: "closed", canReply: false } : t));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Shell brand={brand}>
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      </Shell>
    );
  }

  if (error || !thread) {
    return (
      <Shell brand={brand}>
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-14 text-center">
          <Lock size={22} className="mx-auto text-gray-300 mb-3" />
          <h1 className="text-lg font-bold text-gray-900 mb-1">This link doesn't work</h1>
          <p className="text-sm text-gray-500 mb-6">{error || "Please use the link from your latest email."}</p>
          <Link to="/" className="inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: brand.accent }}>
            Go to the website
          </Link>
        </div>
      </Shell>
    );
  }

  const st = STATUS_TEXT[thread.status] || STATUS_TEXT.open;
  const StIcon = st.icon;
  const items = [
    ...(thread.message ? [{ _id: "original", from: "you", body: thread.message, createdAt: thread.createdAt }] : []),
    ...(thread.messages || []),
  ];

  return (
    <Shell brand={brand}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Enquiry ENQ-{thread.ticketNo}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Hi {thread.name || "there"}</h1>
        </div>

        <div className="rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm" style={{ background: brand.soft, color: "#374151" }}>
          <StIcon size={17} className="mt-0.5 shrink-0" style={{ color: brand.accent }} />
          {st.text}
        </div>

        <div className="space-y-3">
          {items.map((m) => (
            <div key={m._id} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
              <div
                className={`w-full sm:max-w-[85%] rounded-2xl px-4 py-3 border ${m.from === "you" ? "bg-white border-gray-200" : "border-transparent"}`}
                style={m.from === "you" ? undefined : { background: brand.soft }}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-xs font-semibold" style={{ color: m.from === "you" ? "#374151" : brand.accent }}>
                    {m.from === "you" ? "You" : `${brand.name} Support`}
                  </span>
                  <span className="text-[11px] text-gray-400">{formatUtcDateTime12h(m.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
              </div>
            </div>
          ))}
        </div>

        {thread.canReply ? (
          <form onSubmit={send} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
            <label htmlFor="support-reply" className="block text-sm font-semibold text-gray-800 mb-2">
              {thread.status === "resolved" ? "Still need help?" : "Add a message"}
            </label>
            <textarea
              id="support-reply"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              rows={4}
              placeholder="Type your message…"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 resize-y min-h-[110px] focus:outline-none focus:ring-1"
              style={{ "--tw-ring-color": brand.accent }}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-400">
                {text.length} / {MAX}
              </span>
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: brand.accent }}
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-6 text-center">
            <p className="text-sm text-gray-600 mb-4">This enquiry is closed. Need more help? Send us a new enquiry from our website.</p>
            <Link to="/" className="inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: brand.accent }}>
              Go to the website
            </Link>
          </div>
        )}

        <p className="text-[11px] text-gray-400 text-center">This page is private to you — please don't share the link.</p>
      </div>
    </Shell>
  );
}
