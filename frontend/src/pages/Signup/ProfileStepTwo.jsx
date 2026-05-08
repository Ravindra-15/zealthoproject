// src/pages/Signup/ProfileStepTwo.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import Navbar from "../../components/layout/Navbar";
import CustomerNavbar from "../../components/customer/layout/CustomerNavbar";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import ProgressBar from "../../components/common/ProgressBar";
import { profileStepTwo } from "../../services/authService";
import { validateProfileStep2 } from "../../utils/validators";
import toast from "react-hot-toast";

const ProfileStepTwo = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    dob: "",
    country: "",
    city: "",
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

    if (user?.dob || user?.country || user?.city) {
      setForm({
        dob: user.dob ? user.dob.split("T")[0] : "",
        country: user.country || "",
        city: user.city || "",
      });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const error = validateProfileStep2(form);
    if (error) return toast.error(error);

    try {
      setLoading(true);
      await profileStepTwo(form);

      const storedUser =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));

      const updatedUser = {
        ...storedUser,
        dob: form.dob,
        country: form.country,
        city: form.city,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      sessionStorage.setItem("user", JSON.stringify(updatedUser));

      const storage = localStorage.getItem("token")
        ? localStorage
        : sessionStorage;

      

      navigate("/home", { replace: true });
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
      <CustomerNavbar />

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
              I was struggling with stress and anxiety, but the mindfulness
              programs helped me regain balance. I finally feel like I'm
              prioritizing my well-being.
            </p>

            <p className="mt-4 text-xs text-gray-500">
              — Anna R., 32 <br />
              (Diabmukt Member)
            </p>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="w-full max-w-md flex flex-col gap-4">
          {/* Progress bar in its OWN white card */}
          <div className="bg-white rounded-2xl shadow-sm px-6 py-4">
            <ProgressBar step={2} total={3} />
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-lg px-6 sm:px-10 py-8 sm:py-10">
            <h2 className="text-3xl font-bold text-center text-teal-900 mb-8">
              Build Your Profile
            </h2>

            <div className="flex flex-col gap-5">
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

export default ProfileStepTwo;
