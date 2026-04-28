// src/pages/Signup/ProfileStepTwo.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import ProgressBar from "../../components/common/ProgressBar";
import { profileStepTwo } from "../../services/authService";

const ProfileStepTwo = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    dob: "",
    country: "",
    city: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      if (!form.dob || !form.country || !form.city) {
        return alert("All fields are required");
      }

      setLoading(true);

      await profileStepTwo(form);

      // 👉 Go to home after success
      navigate("/home");

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

        {/* LEFT */}
        <div className="max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Stories of Transformation
          </h2>

          <div className="bg-white p-6 rounded-2xl shadow-sm text-sm text-gray-600">
            <p className="mb-4">
              "I was struggling with stress and anxiety, but the mindfulness programs helped me regain balance. I finally feel like I'm prioritizing my well-being."
            </p>
            <p className="text-xs text-gray-500">
              — Anna R., 32 <br />
              (Diabmukt Member)
            </p>
          </div>
        </div>

        {/* RIGHT CARD */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6">

          {/* Progress */}
          <ProgressBar step={2} total={3} />

          <h2 className="text-2xl font-semibold text-center text-teal-800 mt-6 mb-6">
            Build Your Profile
          </h2>

          <div className="flex flex-col gap-4">

            <Input
              type="date"
              label="Select Your Date of Birth"
              name="dob"
              value={form.dob}
              onChange={handleChange}
            />

            <Input
              label="Enter your Country"
              placeholder="e.g India"
              name="country"
              value={form.country}
              onChange={handleChange}
            />

            <Input
              label="Enter your City"
              placeholder="e.g Bangalore"
              name="city"
              value={form.city}
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

export default ProfileStepTwo;