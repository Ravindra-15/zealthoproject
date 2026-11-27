/**
 * CUSTOMER — one enquiry, inside the app (logged in)
 * Route: /my-enquiries/:ticketNo
 *
 * Same conversation as the private email link: their messages and our
 * replies (never internal notes or admin names), answer, and rate once
 * resolved. Answering a resolved enquiry reopens it; a closed one can't be
 * answered (they can report a new issue instead). Opening it marks the
 * replies — and their bell notifications — as read.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Send, CheckCircle2, Clock, Lock, MessageSquare, Star } from "lucide-react";
import toast from "react-hot-toast";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import ReportIssueModal from "../MyProfile/components/ReportIssueModal";
import { fetchMyEnquiry, replyToMyEnquiry, rateMyEnquiry } from "../../../services/customerEnquiryService";
import { formatUtcDate, formatUtcDateTime12h } from "../../../utils/time";
import { THEME, programName, ticketText } from "./enquiryUi";
import EnquiryStatusTag from "./EnquiryStatusTag";

const MAX = 2000;

const STATUS_TEXT = {
  open: { icon: Clock, text: "Our team is working on it. We'll reply here and by email." },
  waiting: { icon: MessageSquare, text: "We're waiting for your answer. Please reply below." },
  resolved: { icon: CheckCircle2, text: "Marked as resolved. Still need help? Reply below and it will reopen." },
  closed: { icon: Lock, text: "This enquiry is closed." },
};

const RATE_WORDS = ["", "Very poor", "Poor", "Okay", "Good", "Excellent"];

// page frame — outside the page component so typing never remounts it
const Frame = ({ children }) => (
  <div className="min-h-screen flex flex-col" style={{ background: THEME.page }}>
    <CustomerNavbar />
    <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8">
      <Link to="/my-enquiries" className="inline-flex items-center gap-2 text-gray-500 text-sm mb-6 hover:opacity-80">
        <ArrowLeft size={18} />
        My Enquiries
      </Link>
      {children}
    </main>
    <CustomerFooter />
  </div>
);

export default function MyEnquiryDetail() {
  const { ticketNo } = useParams();
  const navigate = useNavigate();

  const [thread, setThread] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(false);
  const [editingRating, setEditingRating] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const busy = useRef(false);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      try {
        const d = await fetchMyEnquiry(ticketNo);
        setThread(d);
        setError("");
      } catch (err) {
        if (!quiet) setError(err?.response?.data?.message || "We couldn't open this enquiry. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [ticketNo]
  );

  useEffect(() => {
    let alive = true;
    fetchMyEnquiry(ticketNo)
      .then((d) => {
        if (!alive) return;
        setThread(d);
        setError("");
      })
      .catch((err) => alive && setError(err?.response?.data?.message || "We couldn't open this enquiry. Please try again."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ticketNo]);

  // 🔄 coming back to the tab picks up new replies (not while sending)
  useEffect(() => {
    const onFocus = () => {
      if (!busy.current && document.visibilityState === "visible") load({ quiet: true });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    try {
      busy.current = true;
      setSending(true);
      setThread(await replyToMyEnquiry(ticketNo, body));
      setText("");
      toast.success("Message sent. We'll reply here and by email.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't send your message. Please try again.");
      if (err?.response?.data?.code === "CLOSED") setThread((t) => (t ? { ...t, status: "closed", canReply: false } : t));
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  const submitRating = async (e) => {
    e.preventDefault();
    if (!stars || rating) return;
    try {
      busy.current = true;
      setRating(true);
      setThread(await rateMyEnquiry(ticketNo, stars, comment.trim()));
      setEditingRating(false);
      toast.success("Thanks for your rating!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save your rating. Please try again.");
    } finally {
      busy.current = false;
      setRating(false);
    }
  };

  if (loading) {
    return (
      <Frame>
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      </Frame>
    );
  }

  if (error || !thread) {
    return (
      <Frame>
        <div className="bg-white rounded-2xl border px-6 py-14 text-center" style={{ borderColor: THEME.border }}>
          <Lock size={22} className="mx-auto text-gray-300 mb-3" />
          <h1 className="text-lg font-bold text-gray-900 mb-1">We couldn't open this enquiry</h1>
          <p className="text-sm text-gray-500 mb-6">{error || "Please try again."}</p>
          <button
            type="button"
            onClick={() => navigate("/my-enquiries")}
            className="inline-flex px-5 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: THEME.accent }}
          >
            See all my enquiries
          </button>
        </div>
      </Frame>
    );
  }

  const brand = programName(thread.source);
  const st = STATUS_TEXT[thread.status] || STATUS_TEXT.open;
  const StIcon = st.icon;
  const showRatingForm = thread.canRate && (!thread.rating || editingRating);
  const items = [
    ...(thread.message ? [{ _id: "original", from: "you", body: thread.message, createdAt: thread.createdAt }] : []),
    ...(thread.messages || []),
  ];

  return (
    <Frame>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">
            {thread.type === "issue" ? "Reported issue" : "Enquiry"} {ticketText(thread.ticketNo)}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 break-words">{thread.subject || "Your enquiry"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <EnquiryStatusTag status={thread.status} />
            <span>{brand}</span>
            <span>· Sent {formatUtcDate(thread.createdAt)}</span>
          </div>
        </div>

        <div className="rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-gray-700" style={{ background: THEME.soft }}>
          <StIcon size={17} className="mt-0.5 shrink-0" style={{ color: THEME.accent }} />
          {st.text}
        </div>

        <div className="space-y-3">
          {items.map((m) => (
            <div key={m._id} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
              <div
                className={`w-full sm:max-w-[85%] rounded-2xl px-4 py-3 border ${m.from === "you" ? "bg-white border-gray-200" : "border-transparent"}`}
                style={m.from === "you" ? undefined : { background: THEME.soft }}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-xs font-semibold" style={{ color: m.from === "you" ? "#374151" : THEME.accent }}>
                    {m.from === "you" ? "You" : `${brand} Support`}
                  </span>
                  <span className="text-[11px] text-gray-400">{formatUtcDateTime12h(m.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
              </div>
            </div>
          ))}
          {(thread.messages || []).length === 0 && thread.status !== "closed" && (
            <p className="text-xs text-gray-400 text-center">No reply yet. We'll let you know here and by email.</p>
          )}
        </div>

        {/* ⭐ RATING */}
        {thread.canRate && thread.rating && !editingRating && (
          <div className="bg-white rounded-2xl border px-5 py-4 flex items-center justify-between gap-3" style={{ borderColor: THEME.border }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">Thanks for your rating</p>
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={16} className={n <= thread.rating.score ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
                ))}
                <span className="ml-1">{thread.rating.score} / 5</span>
              </p>
              {thread.rating.comment && <p className="text-xs text-gray-500 mt-1 break-words">“{thread.rating.comment}”</p>}
            </div>
            <button
              type="button"
              onClick={() => {
                setStars(thread.rating.score);
                setComment(thread.rating.comment || "");
                setEditingRating(true);
              }}
              className="shrink-0 text-sm font-semibold"
              style={{ color: THEME.accent }}
            >
              Change
            </button>
          </div>
        )}
        {showRatingForm && (
          <form onSubmit={submitRating} className="bg-white rounded-2xl border p-4 sm:p-5" style={{ borderColor: THEME.border }}>
            <p className="text-sm font-semibold text-gray-800 mb-2">How did we do?</p>
            <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={stars === n}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1"
                >
                  <Star size={28} className={n <= (hover || stars) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-500">{RATE_WORDS[hover || stars] || "Tap a star"}</span>
            </div>
            <label htmlFor="mine-rate-comment" className="block text-xs font-semibold text-gray-600 mt-3 mb-1.5">
              Anything to add? (optional)
            </label>
            <textarea
              id="mine-rate-comment"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
              placeholder="Tell us what went well or what we can do better"
            />
            <div className="mt-2 flex justify-end gap-2">
              {editingRating && (
                <button type="button" onClick={() => setEditingRating(false)} className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 bg-gray-100">
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!stars || rating}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: THEME.accent }}
              >
                {rating && <Loader2 size={14} className="animate-spin" />}
                {editingRating ? "Update rating" : "Send rating"}
              </button>
            </div>
          </form>
        )}

        {thread.canReply ? (
          <form onSubmit={send} className="bg-white rounded-2xl border p-4 sm:p-5" style={{ borderColor: THEME.border }}>
            <label htmlFor="mine-reply" className="block text-sm font-semibold text-gray-800 mb-2">
              {thread.status === "resolved" ? "Still need help?" : "Add a message"}
            </label>
            <textarea
              id="mine-reply"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              rows={4}
              placeholder="Type your message…"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 resize-y min-h-[110px] focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-400">
                {text.length} / {MAX}
              </span>
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: THEME.accent }}
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border px-5 py-6 text-center" style={{ borderColor: THEME.border }}>
            <p className="text-sm text-gray-600 mb-4">This enquiry is closed. Need more help? Tell us about it in a new report.</p>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex px-5 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{ background: THEME.accent }}
            >
              Report an Issue
            </button>
          </div>
        )}
      </div>

      <ReportIssueModal isOpen={reportOpen} onClose={() => setReportOpen(false)} />
    </Frame>
  );
}
