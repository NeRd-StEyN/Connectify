const express = require("express");
const router = express.Router();
const User = require("../models/users");
const auth = require("../middleware/auth");
const { deleteFromCloudinary } = require("../utils/cloudinary");

// Get current user
router.get("/get-user", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Edit user profile
router.post("/edituser", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.username = req.body.n;
    user.description = req.body.d;
    await user.save();
    res.send("Edited successfully");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload profile image (base64 — kept for backward compat)
router.post("/upload-image", auth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.image && !user.image.includes('default-photo.png') && user.image !== image) {
      await deleteFromCloudinary(user.image);
    }

    user.image = image;
    await user.save();
    
    res.json({ imageUrl: image });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user info by username
router.post("/getUserInfo", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username }).select("username description image");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Unable to fetch user details" });
  }
});

// Search users
router.post("/search", auth, async (req, res) => {
  try {
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 20;
    
    const users = await User.find({
      username: { $regex: req.body.search, $options: "i" },
      _id: { $ne: req.user._id }
    })
    .select("username description image")
    .skip((page - 1) * limit)
    .limit(limit);
    
    res.json(users);
  } catch {
    res.status(500).json({ error: "Unable to search users" });
  }
});

// Re-authenticate (now protected with auth middleware!)
router.post("/re-auth", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -tokens");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid user" });
    }
    return res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get user by ID (now protected!)
router.get("/user/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -tokens");
    if (!user) return res.status(404).json("User not found");
    res.json(user);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Change Password ──────────────────────────────────────
router.post("/change-password", auth, async (req, res) => {
  const bcrypt = require("bcryptjs");
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }
  try {
    const user = await require("../models/users").findById(req.user._id);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ message: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(500).json({ message: "Failed to change password" });
  }
});

// ─── Delete Account ───────────────────────────────────────
router.delete("/delete-account", auth, async (req, res) => {
  const Message = require("../models/Message");
  const FriendRequest = require("../models/FriendRequest");
  const Post = require("../models/Posts");
  const Notification = require("../models/Notification");
  try {
    const userId = req.user._id;
    // Delete all related data
    await Promise.all([
      Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),
      FriendRequest.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),
      Post.deleteMany({ user: userId }),
      Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }),
      User.findByIdAndDelete(userId),
    ]);
    res.clearCookie("jwt");
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete account" });
  }
});

module.exports = router;

