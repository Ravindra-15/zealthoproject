
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";

import HeroSearch from "./components/HeroSearch";
import DoctorList from "./components/DoctorList";
import HowToBook from "./components/HowToBook";
import FAQSection from "./components/FAQSection";

import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";

import useCustomerDoctors from "../../../hooks/useCustomerDoctors";

import {
  fetchMyProfile,
  uploadProfilePhoto,
  buildUserPhotoUrl,
} from "../../../services/customerProfileService";

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

  // 👤 Logged-in user (for profile photo in welcome modal)
  const [user, setUser] = useState(null);

  // 📸 Photo upload state
  const fileInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem("welcomeShown");

    if (!alreadyShown) {
      setOpen(true);
      sessionStorage.setItem("welcomeShown", "true");
    }

    // Load user for the welcome modal avatar
    (async () => {
      try {
        const data = await fetchMyProfile();
        setUser(data);
      } catch {
        // soft fail — modal will just show default avatar
      }
    })();
  }, []);

  // ============================================
  // 📸 PHOTO HANDLERS
  // ============================================
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo must be under 2MB");
      e.target.value = "";
      return;
    }

    try {
      setUploadingPhoto(true);

      const updated = await uploadProfilePhoto(file);

      setUser(updated);

      toast.success("Photo updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* 🧭 Top navigation */}
      <CustomerNavbar />

      {/* 📄 Page content */}
      <main className="flex-1">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-8">
         {/* 🟧 Hero + specialty chips */}
          <div id="search-top">
            <HeroSearch
              search={search}
              onSearchChange={setSearch}
              specialty={specialty}
              onSpecialtyChange={setSpecialty}
            />
          </div>

          {/* 🩺 Doctor list */}
          <DoctorList
            doctors={doctors}
            loading={loading}
            pagination={pagination}
            onPrev={prevPage}
            onNext={nextPage}
            onClearFilters={clearFilters}
          />

          {/* 📋 How to book — moved below doctor list */}
          <div id="how-to-book">
            <HowToBook />
          </div>

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

          {/* 👤 Avatar — clickable to upload */}
          <div className="flex flex-col items-center mb-5">
            <div
              onClick={handlePhotoClick}
              className="relative w-28 h-28 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            >
              {user?.profilePhoto ? (
                <img
                  src={buildUserPhotoUrl(user.profilePhoto, user.updatedAt)}
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png"
                  alt="welcome"
                  className="w-20 h-20"
                />
              )}

              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-medium rounded-full">
                  Uploading…
                </div>
              )}
            </div>

            {/* Upload prompt — only when no photo yet */}
            {!user?.profilePhoto && (
              <button
                type="button"
                onClick={handlePhotoClick}
                className="mt-2 text-sm text-orange-500 hover:underline font-medium"
              >
                {uploadingPhoto ? "Uploading…" : "Upload your pic"}
              </button>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

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