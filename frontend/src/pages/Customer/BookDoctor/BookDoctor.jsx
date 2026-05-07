/**
 * CUSTOMER MODULE — Book Doctor Page
 *
 * Discovery experience: navbar + hero search + doctor list
 * + onboarding welcome modal.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";

import HeroSearch from "./components/HeroSearch";
import DoctorList from "./components/DoctorList";
import HowToBook from "./components/HowToBook";
import FAQSection from "./components/FAQSection";

import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";

import useCustomerDoctors from "../../../hooks/useCustomerDoctors";

const BookDoctor = () => {
  const navigate = useNavigate();

  const {
    doctors,
    pagination,
    loading,
    search,
    setSearch,
    specialty,
    setSpecialty,
    nextPage,
    prevPage,
    clearFilters,
  } = useCustomerDoctors({ initialLimit: 10 });

  // ============================================
  // 🎉 Welcome Popup Logic
  // ============================================

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem("welcomeShown");

    if (!alreadyShown) {
      setOpen(true);
      sessionStorage.setItem("welcomeShown", "true");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* 🧭 Top navigation */}
      <CustomerNavbar />

      {/* 📄 Page content */}
      <main className="flex-1">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-8">
          {/* 🟧 Hero + specialty chips */}
          <HeroSearch
            search={search}
            onSearchChange={setSearch}
            specialty={specialty}
            onSpecialtyChange={setSpecialty}
          />

          {/* 🩺 Doctor list */}
          <DoctorList
            doctors={doctors}
            loading={loading}
            pagination={pagination}
            onPrev={prevPage}
            onNext={nextPage}
            onClearFilters={clearFilters}
          />

          {/* 📋 How to book */}
          <HowToBook />

          {/* ❓ FAQ */}
          <FAQSection />
        </div>
      </main>

      {/* 🦶 Footer */}
      <CustomerFooter />

      {/* ============================================ */}
      {/* 🎉 Welcome Modal */}
      {/* ============================================ */}

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div className="text-center px-2">
          <h2 className="text-2xl font-bold text-teal-800 mb-4">
            Welcome to Zealtho
          </h2>

          <img
            src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png"
            alt="welcome"
            className="w-28 h-28 mx-auto mb-5"
          />

          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            Discover expert doctors, wellness programs,
            and personalized healing journeys —
            all in one place.
          </p>

          <Button
            type="button"
            text="Start Exploring Doctors"
            onClick={() => setOpen(false)}
          />

          <p className="text-xs text-gray-400 mt-4">
            🔥 10K+ Users Already Registered
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default BookDoctor;