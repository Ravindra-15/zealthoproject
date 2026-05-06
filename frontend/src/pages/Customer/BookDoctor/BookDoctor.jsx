/**
 * CUSTOMER MODULE — Book Doctor Page
 *
 * Discovery experience: navbar + hero search + doctor list
 * + 3-step "How to Book" + FAQ + footer.
 * Public — no auth required to browse.
 */

import React from "react";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";

import HeroSearch from "./components/HeroSearch";
import DoctorList from "./components/DoctorList";
import HowToBook from "./components/HowToBook";
import FAQSection from "./components/FAQSection";

import useCustomerDoctors from "../../../hooks/useCustomerDoctors";

const BookDoctor = () => {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
    </div>
  );
};

export default BookDoctor;