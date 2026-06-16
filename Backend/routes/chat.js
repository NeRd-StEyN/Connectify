const express = require('express');
const router = express.Router();
const User = require('../models/users');
const FriendRequest = require('../models/FriendRequest');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// ──────────────────────────────────────────────────────────────
// GET CHAT LIST (friends) with last message + unread count
// ──────────────────────────────────────────────────────────────
router.post('/getchatlist', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const searchRegex = new RegExp(req.body.search || '', 'i');

    const friendsList = await FriendRequest.find({
      status: 'accepted',
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .populate('sender', 'username image _id')
      .populate('recipient', 'username image _id');

    const chatUsers = friendsList
      .map((request) =>
        request.sender._id.toString() === userId.toString()
          ? request.recipient
          : request.sender
      )
      .filter((user) => user && searchRegex.test(user.username));

    // Enrich each friend with last message + unread count
    const enriched = await Promise.all(
      chatUsers.map(async (friend) => {
        const [lastMsg, unreadCount] = await Promise.all([
          Message.findOne({
            $or: [
              { sender: userId, recipient: friend._id },
              { sender: friend._id, recipient: userId },
            ],
            deletedFor: { $ne: userId },
          })
            .sort({ timestamp: -1 })
            .select('content image timestamp sender read'),
          Message.countDocuments({
            sender: friend._id,
            recipient: userId,
            read: false,
            deletedFor: { $ne: userId },
          }),
        ]);

        let lastMsgPreview = '';
        if (lastMsg) {
          if (lastMsg.image) {
            lastMsgPreview = '📷 Photo';
          } else {
            lastMsgPreview = lastMsg.content || '';
          }
        }

        return {
          ...friend.toObject(),
          lastMessage: lastMsg
            ? {
                preview: lastMsgPreview,
                timestamp: lastMsg.timestamp,
                isMine: lastMsg.sender.toString() === userId.toString(),
                read: lastMsg.read,
              }
            : null,
          unreadCount,
        };
      })
    );

    // Sort by most recent message
    enriched.sort((a, b) => {
      const ta = a.lastMessage?.timestamp || 0;
      const tb = b.lastMessage?.timestamp || 0;
      return new Date(tb) - new Date(ta);
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to get chat list' });
  }
});

// ──────────────────────────────────────────────────────────────
// SEND MESSAGE
// ──────────────────────────────────────────────────────────────
router.post('/send-message', auth, async (req, res) => {
  try {
    const { recipientId, content, image, audio, replyTo } = req.body;
    const newMessage = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      content: content || '',
      image: image || undefined,
      audio: audio || undefined,
      replyTo: replyTo || null,
    });

    // Populate replyTo if present
    await newMessage.populate('replyTo', 'content image sender');

    // Emit notification to recipient
    const io = req.app.get('io');
    const userSocketMap = req.app.get('userSocketMap');
    const recipientSocketId = userSocketMap.get(recipientId.toString());
    if (recipientSocketId) {
      const sender = await User.findById(req.user._id).select('username image');
      io.to(recipientSocketId).emit('notification', {
        type: 'message',
        sender,
        message: `${sender.username} sent you a message`,
      });
    }

    res.status(201).json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ──────────────────────────────────────────────────────────────
// FETCH CONVERSATION (paginated, cursor-based)
// ──────────────────────────────────────────────────────────────
router.get('/messages/:friendId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { friendId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // ISO timestamp cursor

    const query = {
      $or: [
        { sender: userId, recipient: friendId },
        { sender: friendId, recipient: userId },
      ],
      deletedFor: { $ne: userId },
    };
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('replyTo', 'content image sender');

    const decryptedMessages = messages.reverse().map((msg) => {
      const obj = msg.toObject();
      return obj;
    });

    // Mark messages from friend as read
    await Message.updateMany(
      { sender: friendId, recipient: userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    // Notify friend their messages were read
    const io = req.app.get('io');
    const userSocketMap = req.app.get('userSocketMap');
    const friendSocketId = userSocketMap.get(friendId.toString());
    if (friendSocketId) {
      io.to(friendSocketId).emit('messages-read', { by: userId.toString(), from: friendId });
    }

    res.json({ messages: decryptedMessages, hasMore: messages.length === limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE MESSAGE (for me OR for everyone)
// ──────────────────────────────────────────────────────────────
router.delete('/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteFor } = req.body; // 'me' | 'everyone'
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const isSender = message.sender.toString() === userId.toString();

    if (deleteFor === 'everyone' && isSender) {
      // Hard delete the content, mark as deleted
      message.content = '';
      message.image = undefined;
      message.deleted = true;
      await message.save();

      // Notify recipient via socket
      const io = req.app.get('io');
      const userSocketMap = req.app.get('userSocketMap');
      const recipientSocketId = userSocketMap.get(message.recipient.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('message-deleted', {
          messageId,
          deleteFor: 'everyone',
        });
      }
    } else {
      // Delete for me only
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ──────────────────────────────────────────────────────────────
// REACT TO MESSAGE
// ──────────────────────────────────────────────────────────────
router.post('/messages/:messageId/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const userId = req.user._id.toString();
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (message.reactions.get(userId) === emoji) {
      message.reactions.delete(userId); // toggle off
    } else {
      message.reactions.set(userId, emoji);
    }
    await message.save();

    // Notify the other party
    const io = req.app.get('io');
    const userSocketMap = req.app.get('userSocketMap');
    const otherId = message.sender.toString() === userId ? message.recipient.toString() : message.sender.toString();
    const otherSocketId = userSocketMap.get(otherId);
    if (otherSocketId) {
      io.to(otherSocketId).emit('message-reaction', {
        messageId: message._id,
        reactions: message.reactions,
      });
    }

    res.json({ reactions: message.reactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to react' });
  }
});

// ──────────────────────────────────────────────────────────────
// GET UNREAD COUNT (total unread across all conversations)
// ──────────────────────────────────────────────────────────────
router.get('/messages/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      read: false,
      deletedFor: { $ne: req.user._id },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

module.exports = router;
