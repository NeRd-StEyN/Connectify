const express = require("express");
const router = express.Router();
const User = require("../models/users");
const FriendRequest = require("../models/FriendRequest");
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

// Send friend request
router.post("/sendFriendRequest", auth, async (req, res) => {
  try {
    const senderId = req.user._id;
    const { recipientId } = req.body;
    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!sender || !recipient) {
      return res.status(404).json({ message: "Sender or recipient not found." });
    }

    // Existing pending request?
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId },
      ],
      status: { $in: ["pending", "accepted"] }
    });

    if (existingRequest) {
      const message = existingRequest.status === "accepted"
        ? "You are already friends."
        : "Friend request already pending.";
      return res.status(400).json({ message });
    }

    // Create new request
    const newRequest = new FriendRequest({
      sender: senderId,
      recipient: recipientId,
    });
    await newRequest.save();

    // Create notification for recipient
    await new Notification({
      recipient: recipientId,
      sender: senderId,
      type: "friend_request",
      data: { message: `${sender.username} sent you a friend request` },
    }).save();

    // Emit real-time notification via socket if recipient is online
    const io = req.app.get("io");
    const userSocketMap = req.app.get("userSocketMap");
    const recipientSocketId = userSocketMap.get(recipientId.toString());
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("notification", {
        type: "friend_request",
        sender: { _id: senderId, username: sender.username, image: sender.image },
        message: `${sender.username} sent you a friend request`,
      });
    }

    res.status(201).json({ message: "Friend request sent successfully.", request: newRequest });
  } catch (err) {
    console.error("Error sending friend request:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// Get pending friend requests
router.get("/friendRequests", auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      recipient: req.user._id,
      status: "pending"
    }).populate("sender", "username image");
    res.json(requests);
  } catch {
    res.status(500).json({ error: "Error fetching friend requests" });
  }
});

// Respond to friend request
router.post("/friend-requests/respond", auth, async (req, res) => {
  const { requestId, action } = req.body;

  try {
    const request = await FriendRequest.findById(requestId).populate("sender recipient", "username image");
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = action === "accept" ? "accepted" : "rejected";
    await request.save();

    // If accepted, notify the original sender
    if (action === "accept") {
      const currentUser = await User.findById(req.user._id);
      await new Notification({
        recipient: request.sender._id,
        sender: req.user._id,
        type: "friend_accept",
        data: { message: `${currentUser.username} accepted your friend request` },
      }).save();

      const io = req.app.get("io");
      const userSocketMap = req.app.get("userSocketMap");
      const senderSocketId = userSocketMap.get(request.sender._id.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("notification", {
          type: "friend_accept",
          sender: { _id: req.user._id, username: currentUser.username, image: currentUser.image },
          message: `${currentUser.username} accepted your friend request`,
        });
      }
    }

    res.json({ message: `Friend request ${action}ed successfully.` });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Get friends list
router.get("/friends", auth, async (req, res) => {
  try {
    const friends = await FriendRequest.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
      status: "accepted"
    }).populate("sender recipient", "username image");
    res.json(friends);
  } catch {
    res.status(500).json({ error: "Error fetching friends" });
  }
});

// Remove friend
router.post("/friends/remove", auth, async (req, res) => {
  try {
    const { requestId } = req.body;
    await FriendRequest.findByIdAndDelete(requestId);
    res.json({ message: "Unfriended successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
