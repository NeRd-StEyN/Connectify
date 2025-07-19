const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ Use ObjectId
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ Use ObjectId
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
}, { timestamps: true });

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = FriendRequest;
