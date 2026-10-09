/**
 * ============================================
 * ADMIN MODULE — Trial Approvals (YogaT20 free trial)
 * ============================================
 * List + approve/reject free-trial requests. Visible to admin + super
 * admin alike (not gated to super admin only).
 * Route: /admin/trial-approvals
 * ============================================
 */

import React, { useEffect, useState, useCallback } from "react";
import { Clock, CheckCircle2, XCircle, Loader2, UserCircle2 } from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import ModalShell from "../PortalUsers/components/ModalShell";
import { useSelectedProgram } from "../../../context/SelectedProgramContext";
import { formatUtcDateTime12h } from "../../../utils/time";
import {
  fetchTrialRequests,
  approveTrialRequest,
  rejectTrialRequest,
} from "../../../services/adminFreeTrialService";

const STATUS_FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const StatusPill = ({ status }) => {
  const styles = {
    pending: "bg-amber-50 text-amber-600 border-amber-100",
    approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rejected: "bg-red-50 text-red-500 border-red-100",
  };
  const labels = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${styles[status]}`}>
      {labels[status] || status}
    </span>
  );
};

const TrialApprovals = () => {
  const { selectedProgram } = useSelectedProgram();
  const isYogaT20 = selectedProgram.id === "yogat20";

  const [status, setStatus] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0, hasMore: false });

  // ✅ Approve confirmation
  const [approveTarget, setApproveTarget] = useState(null);
  const [approving, setApproving] = useState(false);

  // ❌ Reject with optional reason
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTrialRequests({ status, page, limit: 15 });
      setRequests(data.requests || []);
      setPagination(data.pagination || { totalPages: 1, total: 0, hasMore: false });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load trial requests");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    if (isYogaT20) load();
  }, [load, isYogaT20]);

  const handleStatusChange = (val) => {
    setStatus(val);
    setPage(1);
  };

  const handleApproveConfirm = async () => {
    if (!approveTarget || approving) return;
    try {
      setApproving(true);
      await approveTrialRequest(approveTarget._id);
      toast.success("Trial approved");
      setApproveTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve request");
    } finally {
      setApproving(false);
    }
  };

  const openReject = (req) => {
    setRejectTarget(req);
    setRejectReason("");
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget || rejecting) return;
    try {
      setRejecting(true);
      await rejectTrialRequest(rejectTarget._id, rejectReason.trim());
      toast.success("Request rejected");
      setRejectTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject request");
    } finally {
      setRejecting(false);
    }
  };

  if (!isYogaT20) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Trial Approvals"
          subtitle="YogaT20-only — approve or reject free trial requests"
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-10 text-center">
          <p className="text-base font-semibold text-gray-800 mb-2">
            Trial approvals are only available for YogaT20
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Switch to YogaT20 using the sidebar dropdown to review trial requests.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Trial Approvals"
        subtitle="Approve or reject free YogaT20 trial requests"
      />

      {/* Status filter chips */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleStatusChange(opt.value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              status === opt.value ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Clock size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No {status !== "all" ? status : ""} requests</p>
          <p className="text-xs text-gray-500">Trial requests will show up here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] divide-y divide-gray-100">
          {requests.map((req) => (
            <div key={req._id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <UserCircle2 size={18} className="text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {req.user?.fullName || req.user?.nickName || "A customer"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    Requested {formatUtcDateTime12h(req.requestedAt || req.createdAt)}
                  </p>
                  {req.status === "rejected" && req.rejectionReason && (
                    <p className="text-xs text-red-500 mt-0.5">Reason: {req.rejectionReason}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusPill status={req.status} />
                {req.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setApproveTarget(req)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
                    >
                      <CheckCircle2 size={13} />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => openReject(req)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      <XCircle size={13} />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Page <span className="font-semibold text-gray-700">{page}</span> of{" "}
            <span className="font-semibold text-gray-700">{pagination.totalPages}</span>{" "}
            ({pagination.total} total)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasMore || loading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ✅ APPROVE CONFIRMATION */}
      <ModalShell isOpen={!!approveTarget} onClose={() => !approving && setApproveTarget(null)} labelledBy="approve-trial-title" busy={approving}>
        <div className="px-6 pt-8 pb-5 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={24} className="text-emerald-600" />
          </div>
          <h2 id="approve-trial-title" className="text-lg font-bold text-gray-900 mb-1.5">
            Approve this free trial?
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">
              {approveTarget?.user?.fullName || approveTarget?.user?.nickName || "This customer"}
            </span>{" "}
            will get instant access to the YogaT20 dashboard for 14 days.
          </p>
        </div>
        <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-center">
          <button type="button" onClick={() => setApproveTarget(null)} disabled={approving} className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleApproveConfirm} disabled={approving} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-60">
            {approving && <Loader2 size={15} className="animate-spin" />}
            Approve
          </button>
        </div>
      </ModalShell>

      {/* ❌ REJECT (optional reason) */}
      <ModalShell isOpen={!!rejectTarget} onClose={() => !rejecting && setRejectTarget(null)} labelledBy="reject-trial-title" busy={rejecting}>
        <div className="px-6 pt-8 pb-2">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <XCircle size={24} className="text-red-600" />
          </div>
          <h2 id="reject-trial-title" className="text-lg font-bold text-gray-900 mb-1.5 text-center">
            Reject this trial request?
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed text-center mb-4">
            The user will be notified and can submit a new request anytime.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Reason (optional) — shown to the user"
            disabled={rejecting}
            className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent disabled:bg-gray-50"
          />
        </div>
        <div className="px-6 pb-6 pt-4 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-center">
          <button type="button" onClick={() => setRejectTarget(null)} disabled={rejecting} className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleRejectConfirm} disabled={rejecting} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60">
            {rejecting && <Loader2 size={15} className="animate-spin" />}
            Reject Request
          </button>
        </div>
      </ModalShell>
    </div>
  );
};

export default TrialApprovals;
