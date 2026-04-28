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
    if (!form.dob || !form.country || !form.city) {
      return alert("All fields required");
    }

    try {
      setLoading(true);
      await profileStepTwo(form);
      navigate("/home");
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
            
            {/* Quote icon */}
            <div className="text-orange-500 text-3xl absolute top-4 left-4">
              “
            </div>

            <p className="text-sm text-gray-600 mt-6 leading-relaxed">
              I was struggling with stress and anxiety, but the mindfulness programs helped me regain balance. I finally feel like I'm prioritizing my well-being.
            </p>

            <p className="mt-4 text-xs text-gray-500">
              — Anna R., 32 <br />
              (Diabmukt Member)
            </p>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

          {/* Progress INSIDE CARD */}
          <div className="mb-6">
            <ProgressBar step={2} total={3} />
          </div>

          <h2 className="text-2xl font-semibold text-center text-teal-800 mb-6">
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