// src/pages/Signup/ProfileStepTwo.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import Navbar from "../../components/layout/Navbar";
import CustomerNavbar from "../../components/customer/layout/CustomerNavbar";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import ProgressBar from "../../components/common/ProgressBar";
import LocationSelect from "../../components/common/LocationSelect";
import { loadCountries, loadStates, loadCities } from "../../data/location";
import { profileStepTwo } from "../../services/authService";
import { validateProfileStep2 } from "../../utils/validators";
import toast from "react-hot-toast";

const ProfileStepTwo = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({ dob: "" });

  // 🌍 Country → State → City cascade. Each holds the selected { code, name }
  // (or null), plus the option lists fetched for the level below it.
  const [country, setCountry] = useState(null);
  const [state, setState] = useState(null);
  const [city, setCity] = useState(null);

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // 📝 Manual fallback — some small countries/territories have no state or
  // city data in the dataset. Rather than block signup, we fall back to a
  // free-text field for that level once we know the dropdown has nothing.
  const [manualState, setManualState] = useState(false);
  const [manualCity, setManualCity] = useState(false);

  const [loading, setLoading] = useState(false);

  // 🌍 Country list loads once, up front (small — ~58KB gzipped)
  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  useEffect(() => {
    const user =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));

    if (user?.dob && user?.country && user?.city) {
      navigate("/book-doctor", { replace: true });
      return;
    }

    if (user?.dob) setForm((f) => ({ ...f, dob: user.dob.split("T")[0] }));
    // Pre-filling the cascade itself needs the country list loaded first
    // (to resolve the stored country name back to an ISO code), so it's
    // handled once `countries` arrives, below.
  }, [navigate]);

  // ↩️ Restore a partially-completed profile once we can match the stored
  // country name back to an option in the loaded list.
  useEffect(() => {
    if (!countries.length) return;
    const user =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));
    if (user?.country && !country) {
      const match = countries.find((c) => c.name === user.country);
      if (match) setCountry(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

  // 🔁 Country changed → fetch its states, reset everything below it
  useEffect(() => {
    setState(null);
    setCity(null);
    setStates([]);
    setCities([]);
    setManualState(false);
    setManualCity(false);

    if (!country) return;

    setStatesLoading(true);
    loadStates(country.code)
      .then((list) => {
        setStates(list);
        if (list.length === 0) {
          // No states for this country — skip straight to city, scoped by
          // country only.
          setManualState(true);
          setCitiesLoading(true);
          loadCities(country.code, undefined)
            .then((cityList) => {
              setCities(cityList);
              if (cityList.length === 0) setManualCity(true);
            })
            .finally(() => setCitiesLoading(false));
        }
      })
      .finally(() => setStatesLoading(false));
  }, [country]);

  // 🔁 State changed → fetch its cities, reset city
  useEffect(() => {
    setCity(null);
    setCities([]);
    setManualCity(false);

    if (!country || !state) return;

    setCitiesLoading(true);
    loadCities(country.code, state.code)
      .then((list) => {
        setCities(list);
        if (list.length === 0) setManualCity(true);
      })
      .finally(() => setCitiesLoading(false));
  }, [state]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const payload = {
      dob: form.dob,
      country: country?.name || "",
      countryIso: country?.code || "",
      state: manualState ? form.stateManual?.trim() || "" : state?.name || "",
      city: manualCity ? form.cityManual?.trim() || "" : city?.name || "",
    };

    const error = validateProfileStep2(payload);
    if (error) return toast.error(error);

    try {
      setLoading(true);
      await profileStepTwo(payload);

      const storedUser =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));

      const updatedUser = {
        ...storedUser,
        dob: payload.dob,
        country: payload.country,
        state: payload.state,
        city: payload.city,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      sessionStorage.setItem("user", JSON.stringify(updatedUser));

      const storage = localStorage.getItem("token")
        ? localStorage
        : sessionStorage;

      sessionStorage.removeItem("welcomeShown"); 

      navigate("/book-doctor", { replace: true });
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
              (Zealtho Member)
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

              <LocationSelect
                label="Select your Country"
                placeholder="Select a country"
                value={country}
                options={countries}
                onChange={setCountry}
                showFlag
              />

              {manualState ? (
                <Input
                  label="Enter your State / Region"
                  placeholder="e.g Maharashtra"
                  name="stateManual"
                  value={form.stateManual || ""}
                  onChange={handleChange}
                />
              ) : (
                <LocationSelect
                  label="Select your State"
                  placeholder={
                    !country ? "Select a country first" : "Select a state"
                  }
                  value={state}
                  options={states}
                  onChange={setState}
                  disabled={!country}
                  loading={statesLoading}
                />
              )}

              {manualCity ? (
                <Input
                  label="Enter your City"
                  placeholder="e.g Mumbai"
                  name="cityManual"
                  value={form.cityManual || ""}
                  onChange={handleChange}
                />
              ) : (
                <LocationSelect
                  label="Select your City"
                  placeholder={
                    !state && !manualState
                      ? "Select a state first"
                      : "Select a city"
                  }
                  value={city}
                  options={cities}
                  onChange={setCity}
                  disabled={!state && !manualState}
                  loading={citiesLoading}
                />
              )}

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
