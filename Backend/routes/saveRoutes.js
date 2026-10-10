const express = require("express");
const router = express.Router();

const Save = require("../models/Save");
const Post = require("../models/Post");

// Save a post
router.post("/save", async (req, res) => {
  try {
    const { userId, postId } = req.body;

    if (!userId || !postId) {
      return res.status(400).json({
        message: "userId and postId are required"
      });
    }

    const alreadySaved = await Save.findOne({
      userId,
      postId
    });

    if (alreadySaved) {
      return res.status(400).json({
        message: "Post already saved"
      });
    }

    const savedPost = new Save({
      userId,
      postId
    });

    await savedPost.save();

    res.status(201).json({
      message: "Post saved successfully",
      savedPost
    });
  } catch (error) {
    res.status(500).json({
      message: "Error saving post",
      error: error.message
    });
  }
});

// Unsave a post
router.delete("/unsave", async (req, res) => {
  try {
    const { userId, postId } = req.body;

    const deleted = await Save.findOneAndDelete({
      userId,
      postId
    });

    if (!deleted) {
      return res.status(404).json({
        message: "Saved post not found"
      });
    }

    res.json({
      message: "Post unsaved successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error unsaving post",
      error: error.message
    });
  }
});

// Get saved posts of a user
router.get("/:userId", async (req, res) => {
  try {
    const savedPosts = await Save.find({
      userId: req.params.userId
    }).populate("postId");

    res.json(savedPosts);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching saved posts",
      error: error.message
    });
  }
});

module.exports = router;