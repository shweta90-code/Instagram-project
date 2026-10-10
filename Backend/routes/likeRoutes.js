const express = require("express");
const router = express.Router();

const Like = require("../models/Like");
const Post = require("../models/Post");

// LIKE / UNLIKE POST
router.post("/:postId", async (req, res) => {
  try {
    const { userId } = req.body;
    const postId = req.params.postId;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    // Check existing like
    const existingLike = await Like.findOne({
      user: userId,
      post: postId,
    });

    // UNLIKE
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);

      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );

      await post.save();

      return res.status(200).json({
        message: "Post unliked successfully",
        liked: false,
        likeCount: post.likes.length,
      });
    }

    // LIKE
    await Like.create({
      user: userId,
      post: postId,
    });

    if (
      !post.likes.some(
        (id) => id.toString() === userId.toString()
      )
    ) {
      post.likes.push(userId);
    }

    await post.save();

    return res.status(200).json({
      message: "Post liked successfully",
      liked: true,
      likeCount: post.likes.length,
    });

  } catch (error) {
    console.error("Like Error:", error);

    return res.status(500).json({
      message: "Like operation failed",
      error: error.message,
    });
  }
});


// GET LIKES OF A POST
router.get("/:postId", async (req, res) => {
  try {
    const likes = await Like.find({
      post: req.params.postId,
    }).populate("user", "username profilePic");

    return res.status(200).json(likes);

  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch likes",
      error: error.message,
    });
  }
});

module.exports = router;