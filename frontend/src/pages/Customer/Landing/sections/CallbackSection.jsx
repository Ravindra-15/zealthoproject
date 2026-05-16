// Zealtho - Callback Section
import { useState } from "react";
import toast from "react-hot-toast";
import { submitEnquiry } from "../../../../services/customerEnquiryService";

const initialForm = { name: "", email: "", phone: "", message: "" };

export default function CallbackSection() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Mobile number is required.");
      return;
    }
    if (!/^\+?[0-9\s-]{7,20}$/.test(form.phone.trim())) {
      toast.error("Please enter a valid mobile number.");
      return;
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await submitEnquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        source: "zealtho",
      });
      toast.success("We'll call you back within 12 hours!");
      setForm(initialForm);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to submit. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border-0 border-b border-gray-300 focus:border-teal-700 outline-none py-2 text-sm text-gray-700 placeholder-gray-400 bg-transparent transition-colors";

  return (
    <section id="callback" className="bg-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-12 lg:py-14">
        {/* Heading */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F2C3D] mb-2">
            Request a <span className="text-orange-500">Callback</span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base">
            We typically respond within 12 hours.
          </p>
        </div>

        {/* Balanced row — centered inside the 1600px wrapper */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-32 items-center justify-center">

          {/* FORM */}
          <div className="w-full lg:w-1/2 space-y-5 sm:space-y-6 max-w-xl mx-auto lg:mx-0">
            <input
              name="name"
              value={form.name}
              onChange={handle}
              placeholder="Name"
              className={inputClass}
            />
            <input
              name="email"
              value={form.email}
              onChange={handle}
              placeholder="Email Address"
              type="email"
              className={inputClass}
            />
            <input
              name="phone"
              value={form.phone}
              onChange={handle}
              placeholder="Mobile Number"
              type="tel"
              className={inputClass}
            />
            <input
              name="message"
              value={form.message}
              onChange={handle}
              placeholder="Message"
              className={inputClass}
            />
            <button
              onClick={submit}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 rounded-full font-semibold shadow-[0_4px_14px_rgba(249,115,22,0.35)] hover:bg-orange-600 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>

          {/* IMAGE */}
          <div className="w-full lg:w-1/2 flex justify-end">
            <div
              className="w-full max-w-2xl h-72 sm:h-80 lg:h-[440px] overflow-hidden lg:translate-x-[10px]"
              style={{
                borderTopLeftRadius: "40px",
                borderTopRightRadius: "40px",
                borderBottomLeftRadius: "50px",
                borderBottomRightRadius: "50px",
              }}
            >
              <img
                src="/images/callback.png"
                alt="Wellness callback"
                className="w-full h-full object-cover"
                style={{
                  display: "block",
                  transform: "scale(1.05)",
                  transformOrigin: "center",
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}