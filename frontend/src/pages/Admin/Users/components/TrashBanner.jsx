/**
 * ADMIN MODULE — "This patient is in Trash" banner (super admin)
 * Shows who moved them, when, the note, and when they'll be deleted.
 * Restore brings the account back as it was; Delete now wipes personal
 * details for good (payments and appointments stay).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";

import { restoreUserFromTrash, deleteUserPermanently } from "../../../../services/userService";
import { confirmDialog } from "../../../../utils/confirmDialog";
import { formatUtcDate } from "../../../../utils/time";

const DAY_MS = 24 * 60 * 60 * 1000;

const TrashBanner = ({ user, onRestored }) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [now] = useState(() => Date.now()); // when the page opened — enough for "days left"
  if (!user?.trashedAt) return null;

  const name = user.fullName || user.nickName || user.email || "this user";
  const daysLeft = user.trashPurgeAt ? Math.max(0, Math.ceil((new Date(user.trashPurgeAt).getTime() - now) / DAY_MS)) : null;

  const restore = async () => {
    if (busy) return;
    const ok = await confirmDialog({
      title: `Restore ${name}?`,
      message: "They can log in again and everything comes back exactly as it was.",
      confirmLabel: "Restore",
    });
    if (!ok) return;
    try {
      setBusy("restore");
      const { user: restored } = await restoreUserFromTrash(user._id);
      toast.success("User restored");
      onRestored?.(restored);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't restore the user");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (busy) return;
    const ok = await confirmDialog({
      title: `Delete ${name} permanently?`,
      message:
        "Their name, email, mobile, photo and address are wiped and can't be brought back. Payments, plans and appointments stay for your records. Their email and mobile become free to sign up again.",
      confirmLabel: "Delete permanently",
      tone: "danger",
    });
    if (!ok) return;
    try {
      setBusy("delete");
      await deleteUserPermanently(user._id);
      toast.success("User deleted permanently");
      navigate("/admin/users/trash", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't delete the user");
      setBusy("");
    }
  };

  return (
    <div role="status" className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0">
          <Trash2 size={17} className="text-red-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-red-800">This user is in Trash</p>
          <p className="text-xs text-red-800/80 mt-0.5">
            Moved on {formatUtcDate(user.trashedAt)}
            {user.trashedByName ? ` by ${user.trashedByName}` : ""}. They can't log in, and their email and mobile can't sign up.
            {daysLeft !== null && (
              <>
                {" "}
                Deleted automatically on <span className="font-semibold">{formatUtcDate(user.trashPurgeAt)}</span>
                {daysLeft > 0 ? ` (in ${daysLeft} day${daysLeft === 1 ? "" : "s"})` : " (today)"}.
              </>
            )}
          </p>
          {user.trashReason && <p className="text-xs text-red-900 mt-1.5 break-words">Reason: {user.trashReason}</p>}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <button
          type="button"
          onClick={restore}
          disabled={!!busy}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
        >
          {busy === "restore" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Restore
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={!!busy}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
        >
          {busy === "delete" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete permanently
        </button>
      </div>
    </div>
  );
};

export default TrashBanner;
