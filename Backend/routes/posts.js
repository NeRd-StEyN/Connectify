const express = require('express');
const router = express.Router();
const Post = require('../models/Posts');
const User = require('../models/users');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const { deleteFromCloudinary } = require('../utils/cloudinary');

// Create Post
router.post('/post', auth, async (req, res) => {
  const { caption, image } = req.body;
  try {
    const post = new Post({ user: req.user._id, caption, image });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: 'Could not create post' });
  }
});

// Get Feed (All Posts)
router.get('/posts', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    const posts = await Post.find({ user: { $ne: req.user._id } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'username image')
      .populate('comments.user', 'username image');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch posts' });
  }
});

// Get My Posts
router.get('/myposts', auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user._id })
      .populate('user', 'username image')
      .populate('comments.user', 'username image')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch your posts' });
  }
});

// Edit Post
router.put('/post/:id', auth, async (req, res) => {
  const { caption, image } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.caption = caption || post.caption;
    post.image = image || post.image;
    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (err) {
    res.status(500).json({ error: 'Could not update post' });
  }
});

// Delete Post
router.delete('/post/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.image && !post.image.includes('default-photo.png')) {
      await deleteFromCloudinary(post.image);
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete post' });
  }
});

// Like/Unlike Post
router.post('/post/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const index = post.likes.indexOf(req.user._id);
    
    if (index === -1) {
      post.likes.push(req.user._id);
      
      // Notify post owner
      if (post.user.toString() !== req.user._id.toString()) {
        const sender = await User.findById(req.user._id).select("username image");
        await new Notification({
          recipient: post.user,
          sender: req.user._id,
          type: "like",
          data: { postId: post._id, message: `${sender.username} liked your post` }
        }).save();
        
        const io = req.app.get("io");
        const userSocketMap = req.app.get("userSocketMap");
        const recipientSocketId = userSocketMap.get(post.user.toString());
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("notification", {
            type: "like",
            sender,
            message: `${sender.username} liked your post`,
          });
        }
      }
    } else {
      post.likes.splice(index, 1);
    }
    await post.save();
    res.json({ likes: post.likes.length });
  } catch (err) {
    res.status(500).json({ error: 'Error liking post' });
  }
});

// Add comment
router.post('/post/:id/comment', auth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.comments.push({ user: req.user._id, text: text.trim() });
    await post.save();

    // Notify post owner
    if (post.user.toString() !== req.user._id.toString()) {
      const sender = await User.findById(req.user._id).select("username image");
      await new Notification({
        recipient: post.user,
        sender: req.user._id,
        type: "comment",
        data: { postId: post._id, message: `${sender.username} commented on your post` }
      }).save();
      
      const io = req.app.get("io");
      const userSocketMap = req.app.get("userSocketMap");
      const recipientSocketId = userSocketMap.get(post.user.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("notification", {
          type: "comment",
          sender,
          message: `${sender.username} commented on your post`,
        });
      }
    }

    const populatedPost = await Post.findById(post._id).populate('comments.user', 'username image');
    res.status(201).json({ message: 'Comment added', comments: populatedPost.comments });
  } catch (err) {
    res.status(500).json({ error: 'Could not add comment' });
  }
});

// Get comments
router.get('/post/:id/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('comments.user', 'username image');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post.comments);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch comments' });
  }
});

// Report Post
router.post('/post/:id/report', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existingReport = await Report.findOne({ reporter: req.user._id, post: post._id });
    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this post' });
    }

    await new Report({
      reporter: req.user._id,
      post: post._id,
      reason: reason || 'Inappropriate content'
    }).save();

    res.json({ message: 'Post reported successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to report post' });
  }
});

module.exports = router;
