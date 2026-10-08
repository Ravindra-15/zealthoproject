/**
 * CUSTOMER MODULE — Doctor Testimonials (public, no auth)
 * Horizontally-scrollable row of feedback cards + a "View All" modal with
 * the full paginated list. Renders nothing if the doctor has no written
 * testimonials yet — never shows an empty/awkward section.
 */

import React, { useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight, X, Loader2, Quote } from "lucide-react";

import {
  listDoctorTestimonials,
} from "../../../../services/customerDoctorService";
import { formatUtcDate } from "../../../../utils/time";

const StarRow = ({ rating, size = 13 }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={size} fill={n <= rating ? "#F59E0B" : "none"} color={n <= rating ? "#F59E0B" : "#D1D5DB"} />
    ))}
  </div>
);

const TestimonialCard = ({ t, themeColor }) => (
  <div className="flex-shrink-0 w-[260px] sm:w-[300px] bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 h-[180px] flex flex-col snap-start">
    <Quote size={18} style={{ color: themeColor }} className="opacity-50 mb-1" />
    <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 flex-1">
      {t.description}
    </p>
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
      <div>
        <p className="text-xs font-semibold text-gray-900">{t.reviewerName}</p>
        <p className="text-[10px] text-gray-400">{formatUtcDate(t.createdAt)}</p>
      </div>
      <StarRow rating={t.rating} />
    </div>
  </div>
);

const DoctorTestimonials = ({ doctorId, themeColor = "#F97316" }) => {
  const [testimonials, setTestimonials] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef(null);

  // 📂 "View All" modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState([]);
  const [modalPage, setModalPage] = useState(1);
  const [modalPagination, setModalPagination] = useState({ totalPages: 1, hasMore: false });
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (!doctorId) return;
    let mounted = true;
    setLoading(true);
    listDoctorTestimonials(doctorId, { page: 1, limit: 10 })
      .then((data) => {
        if (!mounted) return;
        setTestimonials(data.testimonials || []);
        setTotal(data.pagination?.total || 0);
      })
      .catch(() => {
        // soft fail — testimonials are a nice-to-have, never break the booking page
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [doctorId]);

  const scrollBy = (dir) => {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const openModal = () => {
    setModalOpen(true);
    if (modalItems.length === 0) loadModalPage(1);
  };

  const loadModalPage = async (page) => {
    try {
      setModalLoading(true);
      const data = await listDoctorTestimonials(doctorId, { page, limit: 10 });
      setModalItems(data.testimonials || []);
      setModalPage(page);
      setModalPagination(data.pagination || { totalPages: 1, hasMore: false });
    } catch {
      // soft fail — modal just stays on whatever it last had
    } finally {
      setModalLoading(false);
    }
  };

  if (loading || testimonials.length === 0) return null;

  return (
    <div id="doctor-testimonials" className="scroll-mt-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900">
          What patients are saying
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openModal}
            className="text-xs font-semibold hover:underline flex-shrink-0"
            style={{ color: themeColor }}
          >
            View All ({total})
          </button>
          {/* Scroll controls — hidden on touch-friendly small screens, swipe works there */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {testimonials.map((t) => (
          <TestimonialCard key={t._id} t={t} themeColor={themeColor} />
        ))}
      </div>

      {/* ============================================ */}
      {/* 📂 VIEW ALL MODAL                             */}
      {/* ============================================ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">All Feedback ({total})</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {modalLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 size={22} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {modalItems.map((t) => (
                  <div key={t._id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-gray-900">{t.reviewerName}</p>
                      <StarRow rating={t.rating} />
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{t.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">{formatUtcDate(t.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}

            {modalPagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => loadModalPage(modalPage - 1)}
                  disabled={modalPage <= 1 || modalLoading}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="text-[11px] text-gray-400">
                  Page {modalPage} of {modalPagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => loadModalPage(modalPage + 1)}
                  disabled={!modalPagination.hasMore || modalLoading}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorTestimonials;
