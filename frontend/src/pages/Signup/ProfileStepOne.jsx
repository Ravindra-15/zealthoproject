// src/pages/Signup/ProfileStepOne.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import ProgressBar from "../../components/common/ProgressBar";
import { profileStepOne } from "../../services/authService";
import { validateProfileStep1 } from "../../utils/validators";
import toast from "react-hot-toast";

const ProfileStepOne = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    nickName: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));

    if (user?.dob && user?.country && user?.city) {
      navigate("/book-doctor", { replace: true });
      return;
    }

    if (user?.fullName || user?.nickName) {
      setForm({
        fullName: user.fullName || "",
        nickName: user.nickName || "",
      });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const error = validateProfileStep1(form);
    if (error) return toast.error(error);

    try {
      setLoading(true);
      await profileStepOne(form);

      const storedUser =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));

      const updatedUser = {
        ...storedUser,
        fullName: form.fullName,
        nickName: form.nickName,
      };

      if (localStorage.getItem("user")) {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
      }

      navigate("/profile-step-2");
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Navbar />

      <div className="flex flex-col md:flex-row justify-between items-start px-6 md:px-20 py-12 gap-12">
        {/* LEFT SECTION */}
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 leading-snug">
            Stories of <br /> Transformation
          </h2>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative">
            <div className="text-orange-500 text-5xl font-serif absolute top-3 left-5 leading-none">
              ❝
            </div>

            <p className="text-sm text-gray-600 mt-8 leading-relaxed">
              I used to struggle with consistency. YogaT20's streak tracking
              kept me going, and when I had back pain, I could instantly book a
              doctor on the same platform. It's a complete ecosystem.
            </p>

            <p className="mt-4 text-xs text-gray-500">
              — Anna R., 32 <br />
              (Yoga T20 Member)
            </p>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="w-full max-w-md flex flex-col gap-4">
          {/* Progress bar in its OWN white card */}
          <div className="bg-white rounded-2xl shadow-sm px-6 py-4">
            <ProgressBar step={1} total={3} />
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-lg px-6 sm:px-10 py-8 sm:py-10">
            <h2 className="text-3xl font-bold text-center text-teal-900 mb-8">
              Build Your Profile
            </h2>

            <div className="flex flex-col gap-5">
              <Input
                label="Full Name"
                placeholder="Enter your Full Name"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
              />

              <Input
                label="Nick Name ( for Community )"
                placeholder="How should we Call you ?"
                name="nickName"
                value={form.nickName}
                onChange={handleChange}
              />

              <div className="border-t border-gray-200 mt-3 pt-6">
                <Button
                  text={loading ? "Saving..." : "Next"}
                  onClick={handleSubmit}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileStepOne;