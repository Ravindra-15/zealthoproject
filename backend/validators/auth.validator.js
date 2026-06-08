// validators/auth.validator.js

exports.validateSignup = (req, res, next) => {
  let { email, password, phone } = req.body;

  // 🔥 Normalize
  email = email?.toLowerCase().trim();
  password = password?.trim();
  phone = phone?.trim();

  req.body.email = email;
  req.body.password = password;
  req.body.phone = phone;

  // Required
  if (!email || !password || !phone) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  // No whitespace only
  if (!email.trim() || !password.trim() || !phone.trim()) {
    return res.status(400).json({ success: false, message: "Fields cannot be empty or whitespace" });
  }

  // Email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  // Block disposable emails
  const blockedDomains = ["mailinator", "tempmail", "guerrillamail", "throwam"];
  if (blockedDomains.some((d) => email.includes(d))) {
    return res.status(400).json({ success: false, message: "Disposable emails are not allowed" });
  }

  // Password
  if (/\s/.test(password)) {
    return res.status(400).json({ success: false, message: "Password cannot contain spaces" });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
  }

  if (!/\d/.test(password)) {
    return res.status(400).json({ success: false, message: "Password must contain at least 1 number" });
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return res.status(400).json({ success: false, message: "Password must contain at least 1 special character" });
  }

  // Phone
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: "Invalid phone number" });
  }

  next();
};

// 👤 Profile Step 1
exports.validateProfileStep1 = (req, res, next) => {
  let { fullName, nickName } = req.body;

  fullName = fullName?.trim();
  nickName = nickName?.trim();

  req.body.fullName = fullName;
  req.body.nickName = nickName;

  if (!fullName || !nickName) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (fullName.length < 3 || fullName.length > 50) {
    return res.status(400).json({ success: false, message: "Full name must be 3–50 characters" });
  }

  if (!/^[a-zA-Z\s]+$/.test(fullName)) {
    return res.status(400).json({ success: false, message: "Full name can only contain letters and spaces" });
  }

  if (/\s{2,}/.test(fullName)) {
    return res.status(400).json({ success: false, message: "Full name cannot have multiple spaces" });
  }

  const nameParts = fullName.split(" ").filter(Boolean);
  if (nameParts.some((part) => part.length < 2)) {
    return res.status(400).json({ success: false, message: "Each word in full name must be at least 2 characters" });
  }

  if (nickName.length < 2 || nickName.length > 30) {
    return res.status(400).json({ success: false, message: "Nickname must be 2–30 characters" });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(nickName)) {
    return res.status(400).json({ success: false, message: "Nickname can only contain letters, numbers and underscore" });
  }

  if (/^\d+$/.test(nickName)) {
    return res.status(400).json({ success: false, message: "Nickname cannot be only numbers" });
  }

  if (/^[_0-9]/.test(nickName)) {
    return res.status(400).json({ success: false, message: "Nickname must start with a letter" });
  }

  next();
};

// 📍 Profile Step 2
exports.validateProfileStep2 = (req, res, next) => {
  let { dob, country, city } = req.body;

  country = country?.trim();
  city = city?.trim();

  req.body.country = country;
  req.body.city = city;

  if (!dob || !country || !city) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  const selectedDate = new Date(dob);
  const today = new Date();

  if (isNaN(selectedDate.getTime())) {
    return res.status(400).json({ success: false, message: "Invalid date of birth" });
  }

  if (selectedDate >= today) {
    return res.status(400).json({ success: false, message: "DOB must be in the past" });
  }

  if (selectedDate < new Date("1900-01-01")) {
    return res.status(400).json({ success: false, message: "Enter a valid date of birth" });
  }

  // Age check
  const age = today.getFullYear() - selectedDate.getFullYear();
  const monthDiff = today.getMonth() - selectedDate.getMonth();
  const actualAge =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())
      ? age - 1
      : age;

  if (actualAge < 5) {
    return res.status(400).json({ success: false, message: "You must be at least 5 years old" });
  }

  if (actualAge > 120) {
    return res.status(400).json({ success: false, message: "Enter a valid date of birth" });
  }

  const textRegex = /^[a-zA-Z\s]+$/;

  if (!textRegex.test(country) || country.length < 2 || country.length > 60) {
    return res.status(400).json({ success: false, message: "Invalid country name" });
  }

  if (/\s{2,}/.test(country)) {
    return res.status(400).json({ success: false, message: "Country name cannot have multiple spaces" });
  }

  if (!textRegex.test(city) || city.length < 2 || city.length > 60) {
    return res.status(400).json({ success: false, message: "Invalid city name" });
  }

  if (/\s{2,}/.test(city)) {
    return res.status(400).json({ success: false, message: "City name cannot have multiple spaces" });
  }

  next();
};

// Add at the bottom of auth.validator.js

exports.validateVerifyOtp = (req, res, next) => {
  let { email, otp } = req.body;

  email = email?.toLowerCase().trim();
  otp = otp?.toString().trim();

  req.body.email = email;
  req.body.otp = otp;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  // OTP must be exactly 6 digits
  // if (!/^\d{6}$/.test(otp)) {
  //   return res.status(400).json({ success: false, message: "OTP must be 6 digits" });
  // }
  // OTP must be exactly 4 digits
  // if (!/^\d{4}$/.test(otp)) {
  //   return res.status(400).json({ success: false, message: "OTP must be 4 digits" });
  // }

  // OTP must be exactly 3 digits
  if (!/^\d{3}$/.test(otp)) {
    return res.status(400).json({ success: false, message: "OTP must be 3 digits" });
  }

  next();
};

exports.validateResendOtp = (req, res, next) => {
  let { email } = req.body;

  email = email?.toLowerCase().trim();
  req.body.email = email;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  next();
};

exports.validateLogin = (req, res, next) => {
  let { email, password } = req.body;

  email = email?.toLowerCase().trim();
  password = password?.trim();

  req.body.email = email;
  req.body.password = password;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required" });
  }

  next();
};


exports.validateForgotPassword = (req, res, next) => {
  let { email } = req.body;
  email = email?.toLowerCase().trim();
  req.body.email = email;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  next();
};

exports.validateVerifyResetOtp = (req, res, next) => {
  let { email, otp } = req.body;
  email = email?.toLowerCase().trim();
  otp = otp?.toString().trim();
  req.body.email = email;
  req.body.otp = otp;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  if (!/^\d{3}$/.test(otp)) {
    return res.status(400).json({ success: false, message: "OTP must be 3 digits" });
  }

  next();
};

exports.validateResetPassword = (req, res, next) => {
  let { resetToken, password } = req.body;
  password = password?.trim();
  req.body.password = password;

  if (!resetToken) {
    return res.status(400).json({ success: false, message: "Reset token is required" });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required" });
  }

  if (/\s/.test(password)) {
    return res.status(400).json({ success: false, message: "Password cannot contain spaces" });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
  }

  if (!/\d/.test(password)) {
    return res.status(400).json({ success: false, message: "Password must contain at least 1 number" });
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return res.status(400).json({ success: false, message: "Password must contain at least 1 special character" });
  }

  next();
};