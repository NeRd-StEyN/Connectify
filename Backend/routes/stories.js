const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const User = require('../models/User');
const auth = require('./verifytoken');

// Create a new story
router.post('/story', auth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "Image is required" });

    const newStory = await Story.create({
      user: req.user._id,
      image,
    });

    res.status(201).json(newStory);
  } catch (err) {
    console.error("Create story error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all active stories grouped by user
router.get('/stories', auth, async (req, res) => {
  try {
    // A story expires automatically via TTL index, so we just fetch all existing stories
    const stories = await Story.find()
      .populate('user', 'username image')
      .sort({ createdAt: -1 });

    // Group stories by user
    const grouped = {};
    stories.forEach(story => {
      const userId = story.user._id.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          user: story.user,
          stories: [],
        };
      }
      grouped[userId].stories.push(story);
    });

    res.status(200).json(Object.values(grouped));
  } catch (err) {
    console.error("Get stories error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
