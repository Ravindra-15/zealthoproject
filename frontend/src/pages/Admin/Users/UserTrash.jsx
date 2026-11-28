/**
 * ADMIN MODULE — Patient Trash (super admin)
 *
 * Patients moved to Trash: who moved them and when, the reason, and how
 * many days are left before they're deleted automatically. Restore brings
 * an account back as it was; Delete permanently wipes personal details now
 * (payments, plans and appointments stay for the records).
 *
 * Route: /admin/users/trash   ·   Access: Super Admin only
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Search, Trash2, RotateCcw, Loader2, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { listTrashedUsers, restoreUserFromTrash, deleteUserPermanently } from "../../../services/userService";
import { confirmDialog } from "../../../utils/confirmDialog";
import { formatUtcDate } from "../../../utils/time";

const card = "bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)]";

const DaysLeft = ({ days, at }) => {
  const tone = days <= 3 ? "bg-red-50 text-red-700" : days <= 7 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-700";
  return (
    <span className="inline-flex flex-col">
      <span className={`self-start px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone}`}>
        {days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} left`}
      </span>
      <span className="text-[11px] text-gray-400 mt-0.5">{formatUtcDate(at)}</span>
    </span>
  );
};

const UserTrash = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState({ key: null, users: [], pagination: { page: 1, totalPages: 1, total: 0, hasMore: false } });
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [reload, setReload] = useState(0);

  // search waits until typing pauses
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // the list for the current search / page; "loading" until that one arrives
  const key = `${query}|${page}|${reload}`;
  const loading = result.key !== key;
  useEffect(() => {
    let alive = true;
    listTrashedUsers({ search: query, page, limit: 20 })
      .then((d) => alive && setResult({ key, ...d }))
      .catch((err) => {
        if (!alive) return;
        toast.error(err?.response?.data?.message || "Failed to load the Trash");
        setResult((r) => ({ ...r, key }));
      });
    return () => {
      alive = false;
    };
  }, [key, query, page]);

  const data = result;

  const nameOf = (u) => u.fullName || u.nickName || u.email || "This user";

  const restore = async (u) => {
    if (busyId) return;
    const ok = await confirmDialog({
      title: `Restore ${nameOf(u)}?`,
      message: "They can log in again and everything comes back exactly as it was.",
      confirmLabel: "Restore",
    });
    if (!ok) return;
    try {
      setBusyId(u._id);
      await restoreUserFromTrash(u._id);
      toast.success(`${nameOf(u)} restored`);
      setReload((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't restore the user");
    } finally {
      setBusyId("");
    }
  };

  const remove = async (u) => {
    if (busyId) return;
    const ok = await confirmDialog({
      title: `Delete ${nameOf(u)} permanently?`,
      message:
        "Their name, email, mobile, photo and address are wiped and can't be brought back. Payments, plans and appointments stay for your records. Their email and mobile become free to sign up again.",
      confirmLabel: "Delete permanently",
      tone: "danger",
    });
    if (!ok) return;
    try {
      setBusyId(u._id);
      await deleteUserPermanently(u._id);
      toast.success("User deleted permanently");
      setReload((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't delete the user");
    } finally {
      setBusyId("");
    }
  };

  const { users, pagination } = data;
  const btn = "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50";

  const Actions = ({ u }) => (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => restore(u)} disabled={!!busyId} className={`${btn} text-emerald-700 bg-emerald-50 hover:bg-emerald-100`}>
        {busyId === u._id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restore
      </button>
      <button type="button" onClick={() => remove(u)} disabled={!!busyId} className={`${btn} text-red-700 bg-red-50 hover:bg-red-100`}>
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600">
        <ArrowLeft size={16} /> Back to Patient Directory
      </Link>

      <AdminPageHeader
        title="Trash"
        subtitle="Patients moved to Trash are deleted automatically after 30 days. Restore one to bring the account back."
      />

      <div className={`${card} p-4 sm:p-5`}>
        <label htmlFor="trash-search" className="sr-only">
          Search the Trash
        </label>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="trash-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or mobile"
            className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className={`${card} overflow-hidden`}>
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                {["Patient", "Mobile", "Moved to Trash", "Deleted on", ""].map((h) => (
                  <th key={h || "actions"} className="px-4 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <Inbox size={22} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">{query ? "No one in Trash matches your search." : "Trash is empty."}</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-4 max-w-[260px]">
                      <button type="button" onClick={() => navigate(`/admin/users/${u._id}`)} className="text-left min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate hover:text-indigo-700">{nameOf(u)}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">{u.phone ? `${u.countryCode || ""} ${u.phone}` : "—"}</td>
                    <td className="px-4 py-4 max-w-[260px]">
                      <p className="text-sm text-gray-700 whitespace-nowrap">
                        {formatUtcDate(u.trashedAt)}
                        {u.trashedByName ? <span className="text-gray-500"> · {u.trashedByName}</span> : null}
                      </p>
                      {u.trashReason && <p className="text-xs text-gray-500 truncate" title={u.trashReason}>{u.trashReason}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <DaysLeft days={u.daysLeft ?? 0} at={u.trashPurgeAt} />
                    </td>
                    <td className="px-4 py-4">
                      <Actions u={u} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-50">
          {loading && users.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">Loading…</p>
          ) : users.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Inbox size={22} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">{query ? "No one in Trash matches your search." : "Trash is empty."}</p>
            </div>
          ) : (
            users.map((u) => (
              <div key={u._id} className="px-5 py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => navigate(`/admin/users/${u._id}`)} className="text-left min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{nameOf(u)}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </button>
                  <DaysLeft days={u.daysLeft ?? 0} at={u.trashPurgeAt} />
                </div>
                <p className="text-xs text-gray-500">
                  Moved {formatUtcDate(u.trashedAt)}
                  {u.trashedByName ? ` by ${u.trashedByName}` : ""}
                  {u.trashReason ? ` · ${u.trashReason}` : ""}
                </p>
                <Actions u={u} />
              </div>
            ))
          )}
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className={`${card} px-5 py-3 flex items-center justify-between gap-3`}>
          <p className="text-xs text-gray-500">
            Page <span className="font-semibold text-gray-700">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-700">{pagination.totalPages}</span> ({pagination.total} in Trash)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasMore || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTrash;
