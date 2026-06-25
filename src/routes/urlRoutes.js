const express = require("express");
const rateLimit = require("express-rate-limit");
const { shorten, redirect, analytics, remove } = require("../controllers/urlController");

const router = express.Router();

// ─── Rate Limiters ─────────────────────────────────────────────────────────

// Strict limiter for URL creation: 20 requests / 15 minutes per IP
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many URL creation requests. Please try again in 15 minutes.",
  },
});

// Lenient limiter for redirects: 200 requests / minute per IP
const redirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many redirect requests. Slow down!",
  },
});

// General API limiter: 100 requests / minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});

// ─── Routes ────────────────────────────────────────────────────────────────

// Shorten a URL
router.post("/shorten", createLimiter, shorten);

// Analytics for a shortId
router.get("/analytics/:shortId", apiLimiter, analytics);

// Delete a short URL
router.delete("/:shortId", apiLimiter, remove);

// Redirect (mounted at root via app.js)
// Note: redirect is registered on "/" in app.js — see below
// We export it so app.js can mount it directly
router.get("/r/:shortId", redirectLimiter, redirect);

module.exports = router;
module.exports.redirect = redirect;
module.exports.redirectLimiter = redirectLimiter;
