/**
 * Counter — atomic running numbers (e.g. enquiry ticket numbers).
 * One document per sequence: { _id: "enquiry", seq: 42 }.
 */

const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

// Next number in a sequence — safe under concurrent requests ($inc is atomic).
counterSchema.statics.next = async function next(name) {
  const doc = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  ).lean();
  return doc.seq;
};

module.exports = mongoose.model("Counter", counterSchema);
