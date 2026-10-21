// Zealtho - Issue Report Model
// "Report an Issue" submissions from a customer's profile page (any program),
// reviewed and resolved by admins in the admin panel.

const mongoose = require("mongoose");

const ISSUE_CATEGORIES = ["appointment", "payment", "videos", "account", "other"];
const ISSUE_PLATFORMS = ["zealtho", "yogat20", "diabmukt", "mommyfit", "slimfitter"];

const issueReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🏷️ Which program site the report came from
    platform: {
      type: String,
      enum: ISSUE_PLATFORMS,
      required: true,
      default: "zealtho",
      index: true,
    },

    category: {
      type: String,
      enum: ISSUE_CATEGORIES,
      default: "other",
    },

    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      minlength: [3, "Subject is too short"],
      maxlength: [100, "Subject is too long"],
    },

    description: {
      type: String,
      required: [true, "Please describe the issue"],
      trim: true,
      minlength: [10, "Please describe the issue in a little more detail"],
      maxlength: [1000, "Description is too long"],
    },

    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
      index: true,
    },

    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true }
);

issueReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model("IssueReport", issueReportSchema);
module.exports.ISSUE_CATEGORIES = ISSUE_CATEGORIES;
module.exports.ISSUE_PLATFORMS = ISSUE_PLATFORMS;
