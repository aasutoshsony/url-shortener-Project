const { nanoid } = require("nanoid");
const validUrl = require("valid-url");
const Url = require("../models/urlModel");
const { getClient } = require("../config/redis");

const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS) || 3600; // 1 hour default
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SHORT_ID_LENGTH = parseInt(process.env.SHORT_ID_LENGTH) || 7;

// ─── Cache Helpers ──────────────────────────────────────────────────────────

const cacheGet = async (key) => {
  const redis = getClient();
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

const cacheSet = async (key, value, ttlSeconds = CACHE_TTL_SECONDS) => {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.warn(`[Cache] Set failed for key ${key}: ${err.message}`);
  }
};

const cacheDel = async (key) => {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {}
};

// ─── Service Methods ─────────────────────────────────────────────────────────

/**
 * Create a shortened URL.
 * @param {string} originalUrl - The URL to shorten
 * @param {object} options - { customId, ttlDays, createdBy }
 */
const createShortUrl = async (originalUrl, options = {}) => {
  const { customId, ttlDays, createdBy = "anonymous" } = options;

  // Validate URL
  if (!validUrl.isWebUri(originalUrl)) {
    const err = new Error("Invalid or unsupported URL format");
    err.status = 400;
    throw err;
  }

  // Determine shortId
  const shortId = customId ? customId.trim() : nanoid(SHORT_ID_LENGTH);

  // Validate custom ID characters (alphanumeric + hyphen/underscore)
  if (!/^[a-zA-Z0-9_-]+$/.test(shortId)) {
    const err = new Error(
      "Custom ID must be alphanumeric (hyphens and underscores allowed)"
    );
    err.status = 400;
    throw err;
  }

  // Check if custom ID is already taken
  const existing = await Url.findOne({ shortId });
  if (existing) {
    const err = new Error(`Short ID "${shortId}" is already in use`);
    err.status = 409;
    throw err;
  }

  // Compute expiry
  let expiresAt = null;
  if (ttlDays) {
    const days = parseInt(ttlDays);
    if (isNaN(days) || days <= 0) {
      const err = new Error("ttlDays must be a positive integer");
      err.status = 400;
      throw err;
    }
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  // Persist to DB
  const urlDoc = await Url.create({
    shortId,
    originalUrl,
    expiresAt,
    createdBy,
  });

  // Warm the cache immediately
  const cacheTtl = expiresAt
    ? Math.floor((expiresAt - Date.now()) / 1000)
    : CACHE_TTL_SECONDS;

  if (cacheTtl > 0) {
    await cacheSet(shortId, { originalUrl, expiresAt }, cacheTtl);
  }

  return {
    shortId,
    shortUrl: `${BASE_URL}/${shortId}`,
    originalUrl,
    expiresAt,
    createdAt: urlDoc.createdAt,
  };
};

/**
 * Resolve a shortId → original URL, increment click counter.
 * Cache-aside pattern: cache → DB → re-cache.
 */
const resolveShortUrl = async (shortId) => {
  // 1. Check Redis cache
  const cached = await cacheGet(shortId);

  if (cached) {
    // Validate expiry from cache
    if (cached.expiresAt && new Date() > new Date(cached.expiresAt)) {
      await cacheDel(shortId);
      const err = new Error("This short URL has expired");
      err.status = 410;
      throw err;
    }

    // Async click increment (fire-and-forget; don't block redirect)
    Url.updateOne({ shortId }, { $inc: { clicks: 1 } }).exec();

    return cached.originalUrl;
  }

  // 2. Cache miss → query DB
  const urlDoc = await Url.findOne({ shortId });

  if (!urlDoc) {
    const err = new Error("Short URL not found");
    err.status = 404;
    throw err;
  }

  // 3. Check DB-level expiry
  if (urlDoc.expiresAt && new Date() > urlDoc.expiresAt) {
    const err = new Error("This short URL has expired");
    err.status = 410;
    throw err;
  }

  // 4. Increment clicks in DB
  urlDoc.clicks += 1;
  await urlDoc.save();

  // 5. Repopulate cache
  const cacheTtl = urlDoc.expiresAt
    ? Math.floor((urlDoc.expiresAt - Date.now()) / 1000)
    : CACHE_TTL_SECONDS;

  if (cacheTtl > 0) {
    await cacheSet(
      shortId,
      { originalUrl: urlDoc.originalUrl, expiresAt: urlDoc.expiresAt },
      cacheTtl
    );
  }

  return urlDoc.originalUrl;
};

/**
 * Fetch analytics for a given shortId.
 */
const getAnalytics = async (shortId) => {
  const urlDoc = await Url.findOne({ shortId }).lean();

  if (!urlDoc) {
    const err = new Error("Short URL not found");
    err.status = 404;
    throw err;
  }

  return {
    shortId: urlDoc.shortId,
    shortUrl: `${BASE_URL}/${urlDoc.shortId}`,
    originalUrl: urlDoc.originalUrl,
    clicks: urlDoc.clicks,
    expiresAt: urlDoc.expiresAt,
    createdAt: urlDoc.createdAt,
    updatedAt: urlDoc.updatedAt,
    isExpired: urlDoc.expiresAt ? new Date() > urlDoc.expiresAt : false,
  };
};

/**
 * Delete a short URL and evict its cache entry.
 */
const deleteShortUrl = async (shortId) => {
  const result = await Url.deleteOne({ shortId });

  if (result.deletedCount === 0) {
    const err = new Error("Short URL not found");
    err.status = 404;
    throw err;
  }

  await cacheDel(shortId);

  return { message: `Short URL "${shortId}" deleted successfully` };
};

module.exports = {
  createShortUrl,
  resolveShortUrl,
  getAnalytics,
  deleteShortUrl,
};
