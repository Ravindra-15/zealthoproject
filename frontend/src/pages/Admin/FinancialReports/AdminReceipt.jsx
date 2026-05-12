/**
 * ADMIN MODULE — Receipt Viewer
 * Route: /admin/billing/receipt/:id
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Printer } from "lucide-react";
import { getAdminReceipt } from "../../../services/adminFinancialReportService";

export default function AdminReceipt() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAdminReceipt(id);
        setReceipt(data);
      } catch {
        toast.error("Failed to load receipt");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "long",
          day: "2-digit",
          year: "numeric",
        })
      : "—";

  const formatDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("en-US", {
          month: "long",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading receipt...</p>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-700 font-semibold">Receipt not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-sm text-indigo-500 hover:text-indigo-600"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

//   const symbol = receipt.summary?.currency === "INR" ? "₹" : "$";
const symbol = "$";

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-10 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* ── Top Actions ── */}
        <div className="flex items-center justify-between mb-5 print:hidden">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-gray-500 hover:text-indigo-500 text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
          >
            <Printer size={14} />
            Print / Save PDF
          </button>
        </div>

        {/* ── Receipt Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">

          {/* Header */}
          <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-indigo-700 leading-tight">Zealtho</h1>
                <p className="text-xs text-gray-400 mt-0.5 tracking-wide uppercase">Admin Invoice</p>
              </div>
              <div className="text-sm text-gray-600 sm:text-right space-y-1">
                <p>
                  <span className="text-gray-400">Receipt Number: </span>
                  <span className="font-semibold text-gray-800">#{receipt.receiptNumber}</span>
                </p>
                <p>
                  <span className="text-gray-400">Date: </span>
                  <span className="font-medium">{formatDate(receipt.date)}</span>
                </p>
                <p>
                  <span className="text-gray-400">Solution: </span>
                  <span className="font-medium capitalize">{receipt.solution}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Billed To + Professional */}
          <div className="px-6 sm:px-8 py-6 border-b border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Billed To:
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Nickname:{" "}
                  <span className="font-semibold text-gray-900">
                    {receipt.billedTo?.nickname}
                  </span>
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  E-mail:{" "}
                  <span className="font-semibold text-gray-900 break-all">
                    {receipt.billedTo?.email}
                  </span>
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Contact details:{" "}
                  <span className="font-medium text-gray-500">masked for privacy</span>
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Healthcare Professional:
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {receipt.professional?.name}
                </p>
                {receipt.professional?.specialization && (
                  <p className="text-sm text-gray-700">
                    Specialization:{" "}
                    <span className="font-medium">{receipt.professional.specialization}</span>
                  </p>
                )}
                {receipt.professional?.registrationNumber && (
                  <p className="text-sm text-gray-700">
                    Reg No:{" "}
                    <span className="font-medium">{receipt.professional.registrationNumber}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Consultations Summary Table */}
          <div className="px-6 sm:px-8 py-6 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-4">Consultations Summary</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="pb-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-3 text-gray-700">Doctor Consultation Fee</td>
                  <td className="py-3 text-gray-700 text-right">
                    {symbol}{Number(receipt.summary?.consultationFee || 0).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-700">
                    International Transaction Processing Fee
                  </td>
                  <td className="py-3 text-gray-700 text-right">
                    {receipt.summary?.processingFee
                      ? `${symbol}${Number(receipt.summary.processingFee).toFixed(2)}`
                      : "Included"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="px-6 sm:px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-base font-bold text-gray-900">Total Paid</span>
            <span className="text-base font-bold text-gray-900">
              {symbol}{Number(receipt.summary?.total || 0).toFixed(2)}
            </span>
          </div>

          {/* Appointment Footer */}
          <div className="px-6 sm:px-8 py-5">
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-gray-700">
                Appointment Details Scheduled for{" "}
                <span className="font-semibold text-gray-900">
                  {formatDateTime(receipt.appointment?.scheduledAt)}
                </span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}