// Zealtho - Receipt Page
// Printable consultation receipt — billed-to, professional, summary, total
// Route: /billing/receipt/:id (protected, fully-onboarded users)

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Printer } from "lucide-react";
import { fetchReceipt } from "../../../services/customerBillingService";

export default function Receipt() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchReceipt(id);
        setReceipt(data);
      } catch {
        toast.error("Failed to load receipt");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }) : "—";

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

  const symbol = receipt?.summary?.currency === "INR" ? "₹" : "$";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading receipt...</div>
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
            className="mt-4 text-sm text-orange-500 hover:text-orange-600"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-orange-500 text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-colors"
          >
            <Printer size={14} />
            Print / Save PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-8 sm:p-10 print:shadow-none print:border-0 print:rounded-none">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-bold text-teal-700">Zealtho</h1>
            </div>
            <div className="text-sm text-gray-700 sm:text-right space-y-0.5">
              <p>
                <span className="text-gray-400">Receipt Number: </span>
                <span className="font-medium">#{receipt.receiptNumber}</span>
              </p>
              <p>
                <span className="text-gray-400">Date: </span>
                <span className="font-medium">{formatDate(receipt.date)}</span>
              </p>
              <p>
                <span className="text-gray-400">Solution: </span>
                <span className="font-medium">{receipt.solution}</span>
              </p>
            </div>
          </div>

          {/* BILLED TO + PROFESSIONAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-2">Billed To:</p>
              <p className="text-sm text-gray-700">
                Nickname: <span className="font-medium">{receipt.billedTo?.nickname}</span>
              </p>
              <p className="text-sm text-gray-700">
                E-mail: <span className="font-medium break-all">{receipt.billedTo?.email}</span>
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Contact details:{" "}
                <span className="font-medium">masked for privacy</span>
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-gray-400 mb-2">Healthcare Professional:</p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{receipt.professional?.name}</span>
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

          {/* SUMMARY */}
          <div className="py-6 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-4">Consultations Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="py-2 font-medium">Description</th>
                    <th className="py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-50">
                    <td className="py-3 text-gray-700">Doctor Consultation Fee</td>
                    <td className="py-3 text-gray-700 text-right">
                      {symbol}
                      {Number(receipt.summary?.consultationFee || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 text-gray-700">International Transaction Processing Fee</td>
                    <td className="py-3 text-gray-700 text-right">
                      {receipt.summary?.processingFee
                        ? `${symbol}${Number(receipt.summary.processingFee).toFixed(2)}`
                        : "Included"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTAL */}
          <div className="flex items-center justify-between py-5 border-b border-gray-100">
            <span className="text-base font-bold text-gray-800">Total Paid</span>
            <span className="text-base font-bold text-gray-800">
              {symbol}
              {Number(receipt.summary?.total || 0).toFixed(2)}
            </span>
          </div>

          {/* APPOINTMENT */}
          <div className="mt-6 bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-center">
            <p className="text-sm text-gray-700">
              Appointment Details Scheduled for{" "}
              <span className="font-semibold">{formatDateTime(receipt.appointment?.scheduledAt)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}