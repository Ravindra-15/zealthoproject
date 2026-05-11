/**
 * ADMIN MODULE — Enquiries Page
 * Lead recovery dashboard. Click any enquiry to open detail drawer.
 */

import React, { useEffect, useState } from "react";
import {
  Search,
  Calendar,
  User,
  MessageSquare,
  Clock,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { listEnquiries } from "../../../services/adminEnquiryService";
import EnquiryDetailDrawer from "./components/EnquiryDetailDrawer";

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listEnquiries({
          search,
          startDate,
          endDate,
          page: pagination.page,
          limit: 10,
        });
        if (!mounted) return;
        setEnquiries(data.enquiries || []);
        setPagination((prev) => ({
          ...prev,
          totalPages: data.pagination?.totalPages || 1,
          total: data.pagination?.total || 0,
          hasMore: data.pagination?.hasMore || false,
        }));
      } catch (err) {
        if (!mounted) return;
        toast.error(
          err?.response?.data?.message || "Failed to load enquiries"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const handle = setTimeout(load, search ? 350 : 0);
    return () => {
      mounted = false;
      clearTimeout(handle);
    };
  }, [search, startDate, endDate, pagination.page]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [search, startDate, endDate]);

  const formatDateTime = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })} - ${d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const nextPage = () => {
    if (pagination.hasMore && !loading) {
      setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const prevPage = () => {
    if (pagination.page > 1 && !loading) {
      setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Enquiries"
        subtitle="Lead recovery dashboard for incomplete registrations"
      />

      {/* FILTERS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
              <Calendar size={14} />
              Date Range
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-w-0 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              <span className="hidden sm:inline text-gray-400 text-xs shrink-0">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-w-0 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
              <Search size={14} />
              Search
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Name or Mobile Number"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <User size={12} />
                    User Name
                  </span>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <MessageSquare size={12} />
                    Whatsapp
                  </span>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <Mail size={12} />
                    Email
                  </span>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <Clock size={12} />
                    Enquiries Timing
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                    Loading enquiries...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                    No enquiries found.
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr
                    key={enq._id}
                    onClick={() => setSelectedEnquiry(enq)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {enq.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{enq.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 truncate max-w-[220px]">
                      {enq.email || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDateTime(enq.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">
              Loading enquiries...
            </p>
          ) : enquiries.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">
              No enquiries found.
            </p>
          ) : (
            enquiries.map((enq) => (
              <button
                key={enq._id}
                onClick={() => setSelectedEnquiry(enq)}
                className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-semibold text-gray-800 text-sm">{enq.name}</p>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {formatDateTime(enq.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{enq.phone}</p>
                {enq.email && (
                  <p className="text-xs text-gray-500 mt-0.5">{enq.email}</p>
                )}
                {enq.message && (
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">
                    {enq.message}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* PAGINATION */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Page{" "}
            <span className="font-semibold text-gray-700">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-700">{pagination.totalPages}</span>{" "}
            ({pagination.total} total)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevPage}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              type="button"
              onClick={nextPage}
              disabled={!pagination.hasMore || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <EnquiryDetailDrawer
        enquiry={selectedEnquiry}
        onClose={() => setSelectedEnquiry(null)}
      />
    </div>
  );
};

export default Enquiries;