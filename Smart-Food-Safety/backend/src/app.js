
const express = require("express");
const cors = require("cors");
const path = require("path");

const complaintRoutes = require("./routes/complaintRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authorityRoutes = require("./routes/authorityRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const authRoutes = require("./routes/authRoutes");
const shopRoutes = require("./routes/shopRoutes");
const adulterationRoutes = require("./routes/adulterationRoutes");
const intelligenceRoutes = require("./routes/intelligenceRoutes");

console.log("ADMIN ROUTES LOADED");
console.log("AUTHORITY ROUTES LOADED");
console.log("NOTIFICATION ROUTES LOADED");
console.log("INTELLIGENCE ROUTES LOADED");

const app = express();


const helmet = require("helmet");

// ==========================================
// SECURITY HEADERS & CORS MIDDLEWARE
// ==========================================

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

const isProduction = process.env.NODE_ENV === "production";

// Production strictly requires configured explicit origins from environment variables.
// Development/testing permits local Vite dev server ports.
const productionOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const developmentOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  "http://localhost:5179",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
  "http://127.0.0.1:5177",
  "http://127.0.0.1:5178",
  "http://127.0.0.1:5179",
  "http://127.0.0.1:3000",
];

const allowedOrigins = isProduction
  ? productionOrigins
  : Array.from(new Set([...productionOrigins, ...developmentOrigins]));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Non-production regex fallback for dynamic localhost ports
      if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1):(3000|517[3-9])$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

if (process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));


// ==========================================
// UPLOADS FOLDER - PROTECTED ACCESS ONLY
// Direct static access is disabled for privacy and evidence security.
// Evidence must be retrieved through /api/complaints/:id/images/:imageId
// ==========================================


// ==========================================
// HOME / TEST ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Food Safety Backend is running!"
  });
});

// ==========================================
// HEALTH CHECKS (LIVENESS & READINESS)
// ==========================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

app.get("/ready", async (req, res) => {
  try {
    const { sequelize } = require("./config/database");
    await sequelize.authenticate();
    res.status(200).json({
      status: "READY",
      database: "CONNECTED",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: "NOT_READY",
      database: "DISCONNECTED",
      timestamp: new Date().toISOString()
    });
  }
});


// ==========================================
// COMPLAINT ROUTES
// ==========================================

app.use(
  "/api/complaints",
  complaintRoutes
);


// ==========================================
// ADMIN ROUTES
// ==========================================

app.use(
  "/api/admin",
  adminRoutes
);
app.use("/api/auth", authRoutes);

// ==========================================
// AUTHORITY / FSSAI ROUTES
// ==========================================

app.use(
  "/api/authority",
  authorityRoutes
);


// ==========================================
// NOTIFICATION ROUTES
// ==========================================

app.use(
  "/api/notifications",
  notificationRoutes
);

// ==========================================
// SHOP ROUTES
// ==========================================

app.use(
  "/api/shops",
  shopRoutes
);

// ==========================================
// ADULTERATION TEST ROUTES
// ==========================================

app.use(
  "/api/adulteration",
  adulterationRoutes
);

// ==========================================
// FOODSAFE INTELLIGENCE & DECISION SUPPORT ROUTES (PHASE 5)
// ==========================================

app.use(
  "/api/intelligence",
  intelligenceRoutes
);


// ==========================================
// DATABASE TEST
// ==========================================

app.get("/api/test/database", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ success: false, message: "Route not found." });
  }

  try {
    const { User } = require("./models");

    const users = await User.findAll({ attributes: ["id"] });

    res.json({
      success: true,
      message: "Database and Sequelize are working!",
      totalUsers: users.length
    });

  } catch (error) {
    console.error("Database Error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ==========================================
// 404 ROUTE
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found."
  });
});


// ==========================================
// ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  if (err.message && (err.message.includes("Only JPG, PNG and WEBP") || err.message.includes("File too large"))) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  const isProd = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    success: false,
    message: isProd ? "Internal server error." : (err.message || "Internal server error.")
  });
});


// ==========================================
// EXPORT APP
// ==========================================

module.exports = app;