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
    try {
      if (!form.fullName || !form.nickName) {
        return alert("All fields are required");
      }

      setLoading(true);

      await profileStepOne(form);

      navigate("/profile-step-2");

    } catch (err) {
      alert(err.response?.data?.message || "Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      
      <Navbar />

      <div className="flex flex-col md:flex-row justify-between px-6 md:px-16 py-10 gap-10">

        {/* LEFT SIDE */}
        <div className="max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Stories of Transformation
          </h2>

          <div className="bg-white p-6 rounded-2xl shadow-sm text-sm text-gray-600">
            <p className="mb-4">
              "I used to struggle with consistency. YogaT20's streak tracking kept me going, and when I had back pain, I could instantly book a doctor on the same platform. It's a complete ecosystem."
            </p>
            <p className="text-xs text-gray-500">
              — Anna R., 32 <br />
              (Yoga T20 Member)
            </p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6">

          {/* Progress */}
          <ProgressBar step={1} total={3} />

          <h2 className="text-2xl font-semibold text-center text-teal-800 mt-6 mb-6">
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