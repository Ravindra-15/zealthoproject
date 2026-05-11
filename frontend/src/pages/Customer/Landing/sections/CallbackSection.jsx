// Zealtho - Callback Section
// Submits enquiry to real backend; admin sees it in /admin/enquiries
// Source field tags the enquiry as coming from "zealtho" (parent site)

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
    <section id="callback" className="py-14 sm:py-16 lg:py-20 bg-gray-50">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            Request a <span className="text-orange-500">Callback</span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base">
            We typically respond within 12 hours.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center justify-center">
          {/* form */}
          <div className="w-full lg:w-[48%] space-y-6">
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
              className="w-full bg-orange-500 text-white py-3 rounded-full font-semibold shadow-[0_4px_14px_rgba(249,115,22,0.35)] hover:bg-orange-600 transition-colors disabled:opacity-60 mt-4"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>

          {/* image */}
          <div className="w-full lg:w-[42%] flex justify-center">
            <div className="rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(16,24,40,0.08)] max-w-md mx-auto">
              <img
                src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80"
                alt="Wellness"
                className="w-full h-72 object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}