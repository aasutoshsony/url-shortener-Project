require("dotenv").config();
const express = require("express");
const connectDB = require("./src/config/db");
const connectRedis = require("./src/config/redis");
const urlRoutes = require("./src/routes/urlRoutes");
const { redirect, redirectLimiter } = require("./src/routes/urlRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Health check (MUST be before dynamic routes)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ✅ Optional root route (better UX)
app.get("/", (req, res) => {
  res.send("URL Shortener API is running 🚀");
});

// API routes (/api/shorten, /api/analytics/:id, /api/:id DELETE, /api/r/:id)
app.use("/api", urlRoutes);

// ✅ Dynamic redirect route (KEEP LAST)
app.get("/:shortId([a-zA-Z0-9_-]{3,32})", redirectLimiter, redirect);

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// Boot
(async () => {
  await connectDB();
  await connectRedis();
  app.listen(PORT, () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
  });
})();

module.exports = app;

// require("dotenv").config();
// const express = require("express");
// const connectDB = require("./src/config/db");
// const connectRedis = require("./src/config/redis");
// const urlRoutes = require("./src/routes/urlRoutes");
// const { redirect, redirectLimiter } = require("./src/routes/urlRoutes");

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // API routes (/api/shorten, /api/analytics/:id, /api/:id DELETE, /api/r/:id)
// app.use("/api", urlRoutes);

// // Top-level redirect: GET /:shortId → resolves short URLs at root path
// app.get("/:shortId([a-zA-Z0-9_-]{3,32})", redirectLimiter, redirect);

// // Health check
// app.get("/health", (req, res) => {
//   res.json({ status: "ok", timestamp: new Date().toISOString() });
// });

// // Global error handler
// app.use((err, req, res, next) => {
//   console.error(`[ERROR] ${err.message}`);
//   res.status(err.status || 500).json({
//     success: false,
//     error: err.message || "Internal Server Error",
//   });
// });

// // Boot
// (async () => {
//   await connectDB();
//   await connectRedis();
//   app.listen(PORT, () => {
//     console.log(`[SERVER] Running on http://localhost:${PORT}`);
//   });
// })();

// module.exports = app;
