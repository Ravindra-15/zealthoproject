// Zealtho - Edit Profile Modal
// Edit fullName, nickname, dob, country/state/city, phone number + logout shortcut
// All fields required - validates before submit
//
// 🌍 Country/State/City and the phone country-code dropdown reuse the exact
// same components and data as onboarding (LocationSelect + CountryCodeSelect),
// so the edit experience matches signup. Since this edits EXISTING data
// (often free-typed before the dropdown existed), each level tries to
// resolve the saved text to a dropdown option on open; if it can't find a
// confident match, it falls back to an editable text field pre-filled with
// the original value instead of silently discarding it.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { X, LogOut } from "lucide-react";
import { updateMyProfile } from "../../../../services/customerProfileService";
import { useAuth } from "../../../../context/AuthContext";
import {
  validateProfileStep1,
  validateProfileStep2,
  validatePhone,
} from "../../../../utils/validators";
import { COUNTRIES, DEFAULT_COUNTRY } from "../../../../data/countries";
import { loadCountries, loadStates, loadCities } from "../../../../data/location";
import LocationSelect from "../../../../components/common/LocationSelect";
import CountryCodeSelect from "../../../../components/common/CountryCodeSelect";

// 📱 "919876543210" (no separators, as stored) → best-effort { country, number }.
// Tries the longest matching dial code whose remaining digits fit that
// country's expected length; falls back to India + the raw digits if
// nothing lines up (e.g. legacy data saved before country codes existed).
const parseStoredPhone = (raw) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return { country: DEFAULT_COUNTRY, number: "" };

  const byDialCodeLengthDesc = [...COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );
  for (const c of byDialCodeLengthDesc) {
    if (digits.startsWith(c.dialCode)) {
      const rest = digits.slice(c.dialCode.length);
      if (rest.length >= c.min && rest.length <= c.max) {
        return { country: c, number: rest };
      }
    }
  }
  return { country: DEFAULT_COUNTRY, number: digits.slice(0, DEFAULT_COUNTRY.max) };
};

export default function EditProfileModal({ user, onClose, onUpdated }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    nickName: user?.nickName || user?.nickname || "",
    dob: user?.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
    stateManual: user?.state || "",
    cityManual: user?.city || "",
  });

  // 🌍 Country → State → City cascade (same shape as onboarding)
  const [country, setCountry] = useState(null);
  const [state, setState] = useState(null);
  const [city, setCity] = useState(null);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [manualState, setManualState] = useState(false);
  const [manualCity, setManualCity] = useState(false);
  const [resolving, setResolving] = useState(true); // initial match-existing-data pass

  // 📱 Phone country-code + number (parsed from the stored `whatsapp` string)
  const parsedPhone = parseStoredPhone(user?.whatsapp || user?.phone);
  const [phoneCountry, setPhoneCountry] = useState(parsedPhone.country);
  const [phoneNumber, setPhoneNumber] = useState(parsedPhone.number);

  const [saving, setSaving] = useState(false);

  // ↩️ Resolve the saved country/state/city text against the dropdown data,
  // once, on open. Anything that doesn't confidently match falls back to an
  // editable text field pre-filled with the original value.
  useEffect(() => {
    (async () => {
      const list = await loadCountries();
      setCountries(list);

      const countryMatch = user?.country
        ? list.find((c) => c.name.toLowerCase() === user.country.trim().toLowerCase())
        : null;

      if (!countryMatch) {
        setResolving(false);
        return;
      }
      setCountry(countryMatch);

      setStatesLoading(true);
      const stateList = await loadStates(countryMatch.code);
      setStates(stateList);
      setStatesLoading(false);

      if (stateList.length === 0) {
        // No states for this country — city is scoped by country only.
        setManualState(true);
        setCitiesLoading(true);
        const cityList = await loadCities(countryMatch.code, undefined);
        setCities(cityList);
        setCitiesLoading(false);
        const cityMatch = user?.city
          ? cityList.find((c) => c.name.toLowerCase() === user.city.trim().toLowerCase())
          : null;
        if (cityMatch) setCity(cityMatch);
        else if (cityList.length === 0) setManualCity(true);
        // else: leave unselected — real dropdown, user just hasn't picked yet
        setResolving(false);
        return;
      }

      const stateMatch = user?.state
        ? stateList.find((s) => s.name.toLowerCase() === user.state.trim().toLowerCase())
        : null;

      if (!stateMatch) {
        // 🎯 Real states exist for this country (stateList.length > 0 here) —
        // the user just hasn't picked one yet (old profile saved before
        // `state` existed, or their old text didn't match). Show the real
        // dropdown so they pick a proper value, same as onboarding — don't
        // fall back to a free-text field just because nothing's selected
        // yet. Manual fallback is reserved for when the dataset itself has
        // no options to offer (handled above and below).
        setResolving(false);
        return;
      }
      setState(stateMatch);

      setCitiesLoading(true);
      const cityList = await loadCities(countryMatch.code, stateMatch.code);
      setCities(cityList);
      setCitiesLoading(false);

      const cityMatch = user?.city
        ? cityList.find((c) => c.name.toLowerCase() === user.city.trim().toLowerCase())
        : null;
      if (cityMatch) setCity(cityMatch);
      else if (cityList.length === 0) setManualCity(true);
      // else: leave unselected — real dropdown, user just hasn't picked yet

      setResolving(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  // 🔁 Country changed by the user → fresh cascade (same as onboarding)
  const handleCountryChange = async (c) => {
    setCountry(c);
    setState(null);
    setCity(null);
    setStates([]);
    setCities([]);
    setManualState(false);
    setManualCity(false);

    setStatesLoading(true);
    const list = await loadStates(c.code);
    setStates(list);
    setStatesLoading(false);

    if (list.length === 0) {
      setManualState(true);
      setCitiesLoading(true);
      const cityList = await loadCities(c.code, undefined);
      setCities(cityList);
      setCitiesLoading(false);
      if (cityList.length === 0) setManualCity(true);
    }
  };

  const handleStateChange = async (s) => {
    setState(s);
    setCity(null);
    setCities([]);
    setManualCity(false);

    setCitiesLoading(true);
    const list = await loadCities(country.code, s.code);
    setCities(list);
    setCitiesLoading(false);
    if (list.length === 0) setManualCity(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handlePhoneNumberChange = (e) => {
    setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, phoneCountry.max));
  };

  const validate = () => {
    const nameError = validateProfileStep1({
      fullName: form.fullName,
      nickName: form.nickName,
    });
    if (nameError) return nameError;

    const locationError = validateProfileStep2({
      dob: form.dob,
      country: country?.name || "",
      state: manualState ? form.stateManual : state?.name || "",
      city: manualCity ? form.cityManual : city?.name || "",
    });
    if (locationError) return locationError;

    const phoneError = validatePhone(phoneNumber, phoneCountry);
    if (phoneError) return phoneError;

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      nickName: form.nickName.trim(),
      dob: form.dob,
      country: country?.name || "",
      countryIso: country?.code || "",
      state: manualState ? form.stateManual.trim() : state?.name || "",
      city: manualCity ? form.cityManual.trim() : city?.name || "",
      // 🌍 Stored the same way it always has been — dial code + national
      // number concatenated, no "+" or separators — so nothing else that
      // reads `whatsapp` (admin masking, etc.) needs to change.
      whatsapp: `${phoneCountry.dialCode}${phoneNumber}`,
    };

    setSaving(true);
    try {
      const updated = await updateMyProfile(payload);
      toast.success("Profile updated successfully");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Edit Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nickname <span className="text-red-500">*</span>
            </label>
            <input
              name="nickName"
              value={form.nickName}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              placeholder="Display name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              required
              max={new Date().toISOString().split("T")[0]}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>

          <LocationSelect
            label="Country"
            placeholder={resolving ? "Loading..." : "Select a country"}
            value={country}
            options={countries}
            onChange={handleCountryChange}
            disabled={resolving}
            showFlag
          />

          {manualState ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                State / Region <span className="text-red-500">*</span>
              </label>
              <input
                name="stateManual"
                autoComplete="off"
                value={form.stateManual}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                placeholder="e.g Maharashtra"
              />
            </div>
          ) : (
            <LocationSelect
              label="State"
              placeholder={!country ? "Select a country first" : "Select a state"}
              value={state}
              options={states}
              onChange={handleStateChange}
              disabled={!country || resolving}
              loading={statesLoading}
            />
          )}

          {manualCity ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                name="cityManual"
                autoComplete="off"
                value={form.cityManual}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                placeholder="e.g Mumbai"
              />
            </div>
          ) : (
            <LocationSelect
              label="City"
              placeholder={!state && !manualState ? "Select a state first" : "Select a city"}
              value={city}
              options={cities}
              onChange={setCity}
              disabled={(!state && !manualState) || resolving}
              loading={citiesLoading}
            />
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex w-full gap-2">
              <CountryCodeSelect
                value={phoneCountry}
                onChange={(c) => {
                  setPhoneCountry(c);
                  setPhoneNumber((prev) => prev.slice(0, c.max));
                }}
              />
              <input
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                placeholder="Phone Number"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-semibold px-6 py-2.5 rounded-full transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
