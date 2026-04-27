// server.js

require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Connect DB first, then start server
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Graceful shutdown (important for production)
    process.on("unhandledRejection", (err) => {
      console.error("❌ Unhandled Rejection:", err.message);
      server.close(() => process.exit(1));
    });

    process.on("uncaughtException", (err) => {
      console.error("❌ Uncaught Exception:", err.message);
      process.exit(1);
    });

  } catch (error) {
    console.error("❌ Server start failed:", error.message);
    process.exit(1);
  }
};

startServer();