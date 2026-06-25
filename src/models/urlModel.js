const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    shortId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    originalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null, // null = no expiry
      index: { expireAfterSeconds: 0, sparse: true }, // MongoDB TTL index
    },
    createdBy: {
      type: String,
      default: "anonymous",
    },
  },
  { timestamps: true }
);

// Virtual: is this URL currently active?
urlSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Ensure virtuals are included when converting to JSON
urlSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Url", urlSchema);
