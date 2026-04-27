const express = require("express");
const app = express();

const authRoutes = require("./routes/auth.routes");
const otpRoutes = require("./routes/otp.routes");
const userRoutes = require("./routes/user.routes");

const { errorHandler } = require("./middleware/error.middleware");

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", otpRoutes);
app.use("/api/user", userRoutes);

// Error Middleware
app.use(errorHandler);

module.exports = app;