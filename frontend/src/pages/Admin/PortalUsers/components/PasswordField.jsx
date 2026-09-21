/**
 * ADMIN MODULE — Portal Users: Password field
 * Show/hide toggle, "Generate" (random strong password) and a live
 * checklist of the password rules.
 */

import { useState } from "react";
import { Lock, Eye, EyeOff, RefreshCw, Check } from "lucide-react";

import { PASSWORD_RULES, generatePassword } from "../passwordRules";

const PasswordField = ({
  id,
  label = "Password",
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const [show, setShow] = useState(false);

  const handleGenerate = () => {
    onChange(generatePassword());
    setShow(true); // reveal it so it can be copied / shared
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor={id}
          className="block text-xs font-semibold tracking-wider text-gray-500 uppercase"
        >
          {label}
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled}
          className="
            inline-flex items-center gap-1
            text-xs font-semibold text-indigo-600 hover:text-indigo-700
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <RefreshCw size={12} />
          Generate
        </button>
      </div>

      <div className="relative">
        <Lock
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete="new-password"
          placeholder="Create a strong password"
          className={`
            w-full pl-10 pr-11 py-3
            bg-white border rounded-xl
            text-sm text-gray-900 placeholder-gray-400
            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
            disabled:bg-gray-50
            transition-colors
            ${error ? "border-red-300" : "border-gray-200"}
          `}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="
            absolute right-2 top-1/2 -translate-y-1/2
            w-8 h-8 rounded-lg
            text-gray-400 hover:text-indigo-600 hover:bg-indigo-50
            flex items-center justify-center
            transition-colors
          "
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}

      {/* ✅ Live rules checklist */}
      <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(value || "");
          return (
            <li
              key={rule.key}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                passed ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              <Check size={12} strokeWidth={passed ? 3 : 2} />
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordField;
