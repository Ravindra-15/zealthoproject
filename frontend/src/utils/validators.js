// src/utils/validators.js

// 🔐 Signup
// `country` = the selected entry from data/countries.js ({ dialCode, min, max, ... }),
// used to check the phone field's digit length against that country's own rule
// instead of the old hardcoded India-only regex.
export const validateSignup = ({ email, password, phone, country }) => {
  if (!email || !password || !phone) return "All fields are required";

  // No whitespace only
  if (!email.trim() || !password.trim() || !phone.trim())
    return "Fields cannot be empty or whitespace";

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) return "Invalid email format";

  // No disposable-looking patterns
  const blockedDomains = ["mailinator", "tempmail", "guerrillamail", "throwam"];
  if (blockedDomains.some((d) => email.includes(d)))
    return "Disposable emails are not allowed";

  // No spaces in password
  if (/\s/.test(password)) return "Password cannot contain spaces";

  if (password.length < 8)
    return "Password must be at least 8 characters";

  if (!/\d/.test(password))
    return "Password must contain at least 1 number";

  if (!/[^a-zA-Z0-9]/.test(password))
    return "Password must contain at least 1 special character";

  const phoneDigits = phone.trim();
  if (!/^\d+$/.test(phoneDigits)) return "Phone number can only contain digits";

  const { min, max, pattern } = country || { min: 10, max: 10 };

  // 📱 Where we know the country's exact mobile format (e.g. Indian mobiles
  // start 6-9), enforce that instead of just the digit count — catches
  // numbers like "1234567890" that are the right length but not a real
  // mobile number.
  if (pattern) {
    if (!new RegExp(pattern).test(phoneDigits)) {
      return "Please enter a valid mobile number for the selected country";
    }
    return null;
  }

  if (phoneDigits.length < min || phoneDigits.length > max) {
    return min === max
      ? `Phone number must be ${min} digits for the selected country`
      : `Phone number must be ${min}–${max} digits for the selected country`;
  }

  return null;
};

// 👤 Profile Step 1
export const validateProfileStep1 = ({ fullName, nickName }) => {
  if (!fullName || !nickName) return "All fields are required";

  // No whitespace only
  if (!fullName.trim() || !nickName.trim())
    return "Fields cannot be empty or whitespace";

  // Full name
  if (fullName.trim().length < 3)
    return "Full name must be at least 3 characters";
  if (fullName.trim().length > 50)
    return "Full name cannot exceed 50 characters";

  const nameRegex = /^[a-zA-Z\s]+$/;
  if (!nameRegex.test(fullName.trim()))
    return "Full name can only contain letters and spaces";

  // No consecutive spaces
  if (/\s{2,}/.test(fullName)) return "Full name cannot have multiple spaces";

  // No single character words (e.g "A B")
  const nameParts = fullName.trim().split(" ").filter(Boolean);
  if (nameParts.some((part) => part.length < 2))
    return "Each word in full name must be at least 2 characters";

  // Nickname
  if (nickName.trim().length < 2)
    return "Nickname must be at least 2 characters";
  if (nickName.trim().length > 30)
    return "Nickname cannot exceed 30 characters";

  const nickRegex = /^[a-zA-Z0-9_]+$/;
  if (!nickRegex.test(nickName.trim()))
    return "Nickname can only contain letters, numbers and underscore";

  // Nickname can't be all numbers
  if (/^\d+$/.test(nickName.trim()))
    return "Nickname cannot be only numbers";

  // Nickname can't start with underscore or number
  if (/^[_0-9]/.test(nickName.trim()))
    return "Nickname must start with a letter";

  return null;
};

// 📍 Profile Step 2
export const validateProfileStep2 = ({ dob, country, state, city }) => {
  if (!dob || !country || !state || !city) return "All fields are required";

  if (!country.trim() || !state.trim() || !city.trim())
    return "Fields cannot be empty or whitespace";

  const selectedDate = new Date(dob);
  const today = new Date();

  // Valid date check
  if (isNaN(selectedDate.getTime())) return "Invalid date of birth";

  // Not future date
  if (selectedDate >= today) return "DOB must be in the past";

  // Not unrealistically old
  const minDate = new Date("1900-01-01");
  if (selectedDate < minDate) return "Enter a valid date of birth";

  // Minimum age 5
  const age = today.getFullYear() - selectedDate.getFullYear();
  const monthDiff = today.getMonth() - selectedDate.getMonth();
  const actualAge =
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < selectedDate.getDate())
      ? age - 1
      : age;

  if (actualAge < 5) return "You must be at least 5 years old";
  if (actualAge > 120) return "Enter a valid date of birth";

  // 🌍 Unicode letters (so accented names like "Wörgl" or "Curaçao" — which
  // come straight from the country/state/city dataset — aren't rejected),
  // plus the punctuation real place names actually use.
  const textRegex = /^[\p{L}\s.'-]+$/u;

  // Country
  if (!textRegex.test(country.trim()))
    return "Country name can only contain letters";
  if (country.trim().length < 2)
    return "Country name must be at least 2 characters";
  if (country.trim().length > 60) return "Country name is too long";

  // State
  if (!textRegex.test(state.trim()))
    return "State name can only contain letters";
  if (state.trim().length < 2)
    return "State name must be at least 2 characters";
  if (state.trim().length > 60) return "State name is too long";

  // City
  if (!textRegex.test(city.trim()))
    return "City name can only contain letters";
  if (city.trim().length < 2)
    return "City name must be at least 2 characters";
  if (city.trim().length > 60) return "City name is too long";

  return null;
};