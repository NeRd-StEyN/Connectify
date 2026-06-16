const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content:   { type: String, default: "" },
  image:     { type: String },
  audio:     { type: String },

  // Read receipts
  read:      { type: Boolean, default: false },
  readAt:    { type: Date },

  // Soft-delete: per-user deletion
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  deleted: { type: Boolean, default: false },

  // Reply threading
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },

  // Reactions: { userId: emoji }
  reactions: {
    type: Map,
    of: String,
    default: {}
  },

  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);
