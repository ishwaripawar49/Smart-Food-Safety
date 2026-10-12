require("dotenv").config();

const { validateEnv } = require("./config/envValidator");
validateEnv();

const app = require("./app");
const { connectDatabase, sequelize } = require("./config/database");

require("./models");

const PORT = process.env.PORT || 5000;

let server;

// ==========================================
// START SERVER
// ==========================================
const startServer = async () => {
  try {
    await connectDatabase();
    console.log("Database connected successfully.");

    server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Gracefully shutting down...`);
  if (server) {
    server.close(async () => {
      console.log("HTTP server closed.");
      try {
        await sequelize.close();
        console.log("Database connection closed.");
      } catch (err) {
        console.error("Error closing database connection:", err.message);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();