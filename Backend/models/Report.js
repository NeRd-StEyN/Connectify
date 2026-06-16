const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", reportSchema);
