/**
 * ADMIN MODULE — Move a patient to Trash (super admin)
 *
 * Checks first: upcoming booked appointments block the move (they have to
 * be handled before), active plans / credits are shown as notes. A reason
 * is optional. Deleted automatically after 30 days unless restored.
 */

import { useEffect, useState } from "react";
import { Trash2, Loader2, CalendarClock, Info, AlertTriangle } from "lucide-react";

import ModalShell from "../../PortalUsers/components/ModalShell";
import { getTrashCheck } from "../../../../services/userService";
import { formatUtcDateTime12h } from "../../../../utils/time";

const TrashUserModal = ({ isOpen, user, loading, onConfirm, onClose }) => {
  const [check, setCheck] = useState(null);
  const [checkError, setCheckError] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!isOpen || !user?._id) return undefined;
    let alive = true;
    getTrashCheck(user._id)
      .then((c) => alive && setCheck(c))
      .catch((err) => alive && setCheckError(err?.response?.data?.message || "Couldn't check this user. Please try again."));
    return () => {
      alive = false;
    };
  }, [isOpen, user?._id]); // the parent mounts this fresh each time it opens

  if (!user) return null;
  const name = user.fullName || user.nickName || user.email || "This user";
  const blocked = check && !check.canTrash;
  const days = check?.trashDays || 30;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} labelledBy="trash-user-title" busy={loading} closeOnBackdrop={!loading}>
      <div className="px-6 pt-7 pb-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
          <Trash2 size={26} className="text-red-500" aria-hidden="true" />
        </div>
        <h2 id="trash-user-title" className="text-lg font-bold text-gray-900 text-center mb-1.5">
          Move {name} to Trash?
        </h2>
        <p className="text-sm text-gray-500 text-center leading-relaxed">
          They're signed out and can't log in. Their email and mobile can't be used to sign up again. After {days} days the
          account is deleted for good, unless you restore it from Trash first.
        </p>

        {!check && !checkError && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Checking bookings and plans…
          </div>
        )}

        {checkError && <p className="mt-4 text-sm text-red-600 text-center">{checkError}</p>}

        {check?.upcomingAppointments?.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50/60 p-3.5">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
              <AlertTriangle size={15} /> Can't move yet: upcoming booked appointments
            </p>
            <p className="text-xs text-red-700/80 mt-1">Cancel or complete these first, then try again.</p>
            <ul className="mt-2 space-y-1.5">
              {check.upcomingAppointments.map((a) => (
                <li key={a._id} className="flex items-center gap-2 text-xs text-gray-700">
                  <CalendarClock size={13} className="text-red-400 shrink-0" />
                  <span className="font-medium">{formatUtcDateTime12h(a.scheduledAt)}</span>
                  <span className="text-gray-500">· {a.doctorName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {check?.warnings?.length > 0 && !blocked && (
          <ul className="mt-4 space-y-2">
            {check.warnings.map((w) => (
              <li key={w} className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-900">
                <Info size={14} className="text-amber-500 mt-0.5 shrink-0" /> {w}
              </li>
            ))}
          </ul>
        )}

        {check && !blocked && (
          <div className="mt-4">
            <label htmlFor="trash-reason" className="block text-xs font-semibold text-gray-700 mb-1">
              Reason <span className="font-normal text-gray-400">(optional, only admins see it)</span>
            </label>
            <textarea
              id="trash-reason"
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Asked us to delete their account"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 resize-y"
            />
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-center">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {blocked ? "Close" : "Cancel"}
        </button>
        {!blocked && (
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={loading || !check}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Move to Trash
          </button>
        )}
      </div>
    </ModalShell>
  );
};

export default TrashUserModal;
