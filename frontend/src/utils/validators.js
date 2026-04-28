export const validateSignup = ({ email, password, phone }) => {
  if (!email || !password || !phone) {
    return "All fields are required";
  }

  if (!email.includes("@")) {
    return "Invalid email";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  return null;
};