/**
 * ADMIN MODULE — User Danger Zone
 *
 * Bottom card on Edit User page.
 * Activate/Deactivate toggle with confirmation, and Move to Trash
 * (deleted after 30 days unless restored — see the Trash page).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, Power, Loader2, Trash2 } from "lucide-react";

import { toggleUserStatus } from "../../../../services/userService";
import UserStatusModal from "./UserStatusModal";
import TrashUserModal from "./TrashUserModal";
import { moveUserToTrash } from "../../../../services/userService";

const UserDangerZone = ({ user, onUserUpdated }) => {
  const [toggling, setToggling] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const navigate = useNavigate();

  const handleTrash = async (reason) => {
    if (trashing) return;
    try {
      setTrashing(true);
      const r = await moveUserToTrash(user._id, reason);
      toast.success(r.message || "Moved to Trash");
      setTrashOpen(false);
      navigate("/admin/users/trash", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't move the user to Trash");
    } finally {
      setTrashing(false);
    }
  };

  // in Trash: the banner at the top has Restore / Delete; nothing else here
  if (user?.trashedAt) return null;

  const handleConfirm = async (flagInfo) => {
    if (toggling) return;

    const action = user.isActive ? "deactivate" : "activate";
    const targetIsActive = !user.isActive;

    try {
      setToggling(true);
      const data = await toggleUserStatus(user._id, targetIsActive, flagInfo);
      toast.success(
        `User ${data.user.isActive ? "activated" : "deactivated"} successfully`
      );
      onUserUpdated?.(data.user);
      setModalOpen(false);
    } catch (err) {
      const msg = err?.response?.data?.message || `Failed to ${action} user`;
      toast.error(msg);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div
      className="
        bg-white rounded-2xl border border-red-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        p-5 sm:p-6
      "
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-red-50">
        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
          <AlertTriangle size={16} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Account Actions</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Account-level actions. Use with care.
          </p>
        </div>
      </div>

      {/* Toggle action row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {user.isActive ? "Deactivate Account" : "Activate Account"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {user.isActive
              ? "User will lose access immediately. Existing data is preserved."
              : "User will regain access. All existing data remains intact."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={toggling}
          className={`
            inline-flex items-center justify-center gap-1.5
            px-4 py-2 rounded-xl
            text-sm font-semibold
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            flex-shrink-0
            ${
              user.isActive
                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
            }
          `}
        >
          {toggling ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Power size={14} />
          )}
          {user.isActive ? "Deactivate" : "Activate"}
        </button>
      </div>

      {/* Move to Trash */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 pt-5 border-t border-red-50">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Move to Trash</p>
          <p className="text-xs text-gray-500 mt-1">
            Signs them out and blocks their email and mobile. Deleted automatically after 30 days unless you restore it.
            Payments and appointments are kept.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTrashOpen(true)}
          disabled={trashing}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <Trash2 size={14} /> Move to Trash
        </button>
      </div>

      {trashOpen && (
        <TrashUserModal isOpen user={user} loading={trashing} onConfirm={handleTrash} onClose={() => !trashing && setTrashOpen(false)} />
      )}

      <UserStatusModal
        isOpen={modalOpen}
        user={user}
        loading={toggling}
        onConfirm={handleConfirm}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default UserDangerZone;