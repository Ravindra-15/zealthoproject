const express = require("express");
const cors = require("cors");
const app = express();

const authRoutes = require("./routes/auth.routes");
const otpRoutes = require("./routes/otp.routes");
const userRoutes = require("./routes/user.routes");

const { errorHandler } = require("./middleware/error.middleware");

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", otpRoutes);
app.use("/api/user", userRoutes);

// Error Middleware
app.use(errorHandler);

module.exports = app;