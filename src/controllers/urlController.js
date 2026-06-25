const {
  createShortUrl,
  resolveShortUrl,
  getAnalytics,
  deleteShortUrl,
} = require("../services/urlService");

/**
 * POST /api/shorten
 * Body: { originalUrl, customId?, ttlDays?, createdBy? }
 */
const shorten = async (req, res, next) => {
  try {
    const { originalUrl, customId, ttlDays, createdBy } = req.body;

    if (!originalUrl) {
      return res
        .status(400)
        .json({ success: false, error: "originalUrl is required" });
    }

    const data = await createShortUrl(originalUrl, {
      customId,
      ttlDays,
      createdBy,
    });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /:shortId
 * Redirects to original URL (301 permanent / 302 temporary)
 */
const redirect = async (req, res, next) => {
  try {
    const { shortId } = req.params;
    const originalUrl = await resolveShortUrl(shortId);
    return res.redirect(302, originalUrl);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/:shortId
 */
const analytics = async (req, res, next) => {
  try {
    const { shortId } = req.params;
    const data = await getAnalytics(shortId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/:shortId
 */
const remove = async (req, res, next) => {
  try {
    const { shortId } = req.params;
    const data = await deleteShortUrl(shortId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { shorten, redirect, analytics, remove };
