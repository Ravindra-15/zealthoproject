// services/email.service.js

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, otp) => {
  try {
    await transporter.sendMail({
      from: `"Zealtho" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your OTP Code",
      html: `
        <h2>Zealtho Verification Code</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for 5 minutes.</p>
      `,
    });
  } catch (error) {
    console.error("Email Error:", error.message);
    throw new Error("Failed to send email");
  }
};

module.exports = sendEmail;