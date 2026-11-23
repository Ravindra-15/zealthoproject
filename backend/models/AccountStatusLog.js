/**
 * Account Status Log — one row every time a super admin deactivates or
 * reactivates a patient account.
 *
 * The User document only keeps the CURRENT flag (and clears it on
 * reactivation), so this is the permanent history the admin panel shows on
 * the patient's "Account History" tab: what happened, when, who did it and
 * why. Rows are never edited or deleted.
 */

const mongoose = require("mongoose");

const accountStatusLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: ["deactivated", "reactivated"],
      required: true,
    },

    // why — only for deactivations (the reason picked in the modal)
    reasonCode: { type: String, default: "" },
    reasonLabel: { type: String, default: "" },
    description: { type: String, default: "", maxlength: 500 },

    // who — the id plus a snapshot of the name/role, so the history still
    // reads correctly if that admin account is later renamed or removed
    by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    byName: { type: String, default: "" },
    byRole: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

accountStatusLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("AccountStatusLog", accountStatusLogSchema);
