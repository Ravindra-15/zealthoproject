/**
 * CUSTOMER — My Enquiries (logged in)
 * Route: /my-enquiries
 *
 * Every enquiry the customer sent (any program, also ones sent before they
 * had an account, once their email is verified) and every issue they
 * reported — with status, new replies and "rate us". Opens the conversation.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Inbox, Loader2, MessageSquare, AlertTriangle, Star, RefreshCw } from "lucide-react";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import ReportIssueModal from "../MyProfile/components/ReportIssueModal";
import { fetchMyEnquiries } from "../../../services/customerEnquiryService";
import { formatUtcDate } from "../../../utils/time";
import { THEME, programName, ticketText, timeAgo } from "./enquiryUi";
import EnquiryStatusTag from "./EnquiryStatusTag";

const TABS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "done", label: "Resolved" },
];
const inTab = (item, tab) =>
  tab === "all" ? true : tab === "open" ? ["open", "waiting"].includes(item.status) : ["resolved", "closed"].includes(item.status);

export default function MyEnquiries() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [reportOpen, setReportOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const d = await fetchMyEnquiries();
      setItems(d?.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || "We couldn't load your enquiries. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetchMyEnquiries()
      .then((d) => alive && setItems(d?.items || []))
      .catch((err) => alive && setError(err?.response?.data?.message || "We couldn't load your enquiries. Please try again."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, items.filter((i) => inTab(i, t.key)).length])),
    [items]
  );
  const shown = items.filter((i) => inTab(i, tab));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: THEME.page }}>
      <CustomerNavbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 text-sm mb-6 transition-colors hover:opacity-80"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Enquiries</h1>
            <p className="text-gray-500 text-sm mt-1">Your questions and reported issues, and our replies.</p>
          </div>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="w-full sm:w-auto shrink-0 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
            style={{ background: THEME.accent }}
          >
            Report an Issue
          </button>
        </div>

        <div className="bg-white rounded-2xl border shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4 sm:p-6" style={{ borderColor: THEME.border }}>
          {/* tabs */}
          <div className="flex gap-1.5 mb-5 overflow-x-auto" role="tablist">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${active ? "text-white" : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50"}`}
                  style={active ? { background: THEME.accent, borderColor: THEME.accent } : undefined}
                >
                  {t.label}
                  <span className={`ml-1.5 ${active ? "text-white/80" : "text-gray-400"}`}>{counts[t.key] || 0}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  load();
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold"
                style={{ color: THEME.accent }}
              >
                <RefreshCw size={14} /> Try again
              </button>
            </div>
          ) : shown.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: THEME.soft }}>
                <Inbox size={20} style={{ color: THEME.accent }} />
              </div>
              <p className="text-sm font-semibold text-gray-800">
                {items.length === 0 ? "No enquiries yet" : tab === "open" ? "Nothing open right now" : "Nothing resolved yet"}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                {items.length === 0
                  ? "When you send us a question or report an issue, you'll see it here with our replies."
                  : "Switch to All to see everything."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {shown.map((item) => (
                <EnquiryRow key={item.kind === "issue" ? `i-${item.id}` : item.ticketNo} item={item} onOpen={() => navigate(`/my-enquiries/${item.ticketNo}`)} />
              ))}
            </ul>
          )}
        </div>
      </main>

      <CustomerFooter />

      <ReportIssueModal
        isOpen={reportOpen}
        onClose={() => {
          setReportOpen(false);
          load(); // a new report shows up straight away
        }}
      />
    </div>
  );
}

function EnquiryRow({ item, onOpen }) {
  const isIssue = item.type === "issue";
  const clickable = item.kind === "enquiry";
  const Icon = isIssue ? AlertTriangle : MessageSquare;
  const ago = timeAgo(item.updatedAt);
  const when = ago || formatUtcDate(item.updatedAt);

  const body = (
    <>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: THEME.soft }}>
        <Icon size={17} style={{ color: THEME.accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-gray-800 line-clamp-2 break-words">{item.subject}</p>
          <EnquiryStatusTag status={item.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
          {item.unread && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: THEME.accent }}>
              New reply
            </span>
          )}
          {item.ticketNo && <span className="font-medium text-gray-600">{ticketText(item.ticketNo)}</span>}
          <span>{programName(item.source)}</span>
          <span>· {isIssue ? "Reported issue" : item.type === "subscription" ? "Callback request" : "Enquiry"}</span>
          {item.replies > 0 && <span>· {item.replies} {item.replies === 1 ? "reply" : "replies"}</span>}
          <span>· Updated {when}</span>
        </div>
        {item.needsRating && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: THEME.accent }}>
            <Star size={12} /> Tell us how we did
          </p>
        )}
        {!clickable && <p className="mt-1.5 text-[11px] text-gray-400">Our team will contact you by email about this issue.</p>}
      </div>
      {clickable && <ChevronRight size={18} className="text-gray-300 shrink-0 self-center" />}
    </>
  );

  return (
    <li>
      {clickable ? (
        <button
          type="button"
          onClick={onOpen}
          className={`w-full text-left border rounded-xl p-4 flex items-start gap-3 transition-colors hover:bg-gray-50 ${item.unread ? "" : "border-gray-100"}`}
          style={item.unread ? { borderColor: THEME.accent, background: THEME.soft } : undefined}
        >
          {body}
        </button>
      ) : (
        <div className="w-full border border-gray-100 rounded-xl p-4 flex items-start gap-3">{body}</div>
      )}
    </li>
  );
}
