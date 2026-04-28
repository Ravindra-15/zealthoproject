// src/pages/Signup/ProfileStepOne.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import ProgressBar from "../../components/common/ProgressBar";
import { profileStepOne } from "../../services/authService";

const ProfileStepOne = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    nickName: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.fullName || !form.nickName) {
      return alert("All fields required");
    }

    try {
      setLoading(true);
      await profileStepOne(form);
      navigate("/profile-step-2");
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Navbar />

      <div className="flex flex-col md:flex-row justify-between px-6 md:px-20 py-12 gap-12">

        {/* LEFT SECTION */}
        <div className="max-w-md">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 leading-snug">
            Stories of <br /> Transformation
          </h2>

          {/* Testimonial Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative">
            
            {/* Quote */}
            <div className="text-orange-500 text-3xl absolute top-4 left-4">
              “
            </div>

            <p className="text-sm text-gray-600 mt-6 leading-relaxed">
              I used to struggle with consistency. YogaT20's streak tracking kept me going, and when I had back pain, I could instantly book a doctor on the same platform. It's a complete ecosystem.
            </p>

            <p className="mt-4 text-xs text-gray-500">
              — Anna R., 32 <br />
              (Yoga T20 Member)
            </p>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

          {/* Progress INSIDE CARD */}
          <div className="mb-6">
            <ProgressBar step={1} total={3} />
          </div>

          <h2 className="text-2xl font-semibold text-center text-teal-800 mb-6">
            Build Your Profile
          </h2>

          <div className="flex flex-col gap-4">

            <Input
              label="Full Name"
              placeholder="Enter your full name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
            />

            <Input
              label="Nick Name (for Community)"
              placeholder="How should we call you?"
              name="nickName"
              value={form.nickName}
              onChange={handleChange}
            />

            <Button
              text={loading ? "Saving..." : "Next"}
              onClick={handleSubmit}
            />

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileStepOne;