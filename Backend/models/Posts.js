const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who posted
  caption: { type: String },
  image: { type: String }, // URL or path to image
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // array of user ids
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Post", postSchema);