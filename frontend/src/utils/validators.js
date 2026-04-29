// src/utils/validators.js

// 🔐 Signup
export const validateSignup = ({ email, password, phone }) => {
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

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,32}$/;
  if (!passwordRegex.test(password))
    return "Password must be 8–32 chars with uppercase, lowercase, number & special character";

  // No spaces in password
  if (/\s/.test(password)) return "Password cannot contain spaces";

  // No repeated chars like "aaaa1234A@"
  if (/(.)\1{3,}/.test(password))
    return "Password cannot have 4+ repeated characters";

  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phone.trim())) return "Invalid Indian phone number";

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
export const validateProfileStep2 = ({ dob, country, city }) => {
  if (!dob || !country || !city) return "All fields are required";

  if (!country.trim() || !city.trim())
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

  const textRegex = /^[a-zA-Z\s]+$/;

  // Country
  if (!textRegex.test(country.trim()))
    return "Country name can only contain letters";
  if (country.trim().length < 2)
    return "Country name must be at least 2 characters";
  if (country.trim().length > 60) return "Country name is too long";
  if (/\s{2,}/.test(country)) return "Country name cannot have multiple spaces";

  // City
  if (!textRegex.test(city.trim()))
    return "City name can only contain letters";
  if (city.trim().length < 2)
    return "City name must be at least 2 characters";
  if (city.trim().length > 60) return "City name is too long";
  if (/\s{2,}/.test(city)) return "City name cannot have multiple spaces";

  return null;
};