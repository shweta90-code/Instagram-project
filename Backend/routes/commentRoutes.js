const express = require("express");
const router = express.Router();

const Comment = require("../models/Comment");
const Post = require("../models/Post");

// ADD COMMENT
router.post("/", async (req, res) => {
  try {
    const { postId, userId, text } = req.body;

    if (!postId || !userId || !text || !text.trim()) {
      return res.status(400).json({
        message: "Post ID, User ID and comment are required",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const comment = await Comment.create({
      post: postId,
      user: userId,
      text: text.trim(),
    });

    post.comments.push({
      user: userId,
      text: text.trim(),
    });

    await post.save();

    const newComment = await Comment.findById(comment._id).populate(
      "user",
      "username profilePicture"
    );

    res.status(201).json({
      message: "Comment added successfully",
      comment: newComment,
    });
  } catch (error) {
    console.error("Comment Error:", error);

    res.status(500).json({
      message: "Failed to add comment",
      error: error.message,
    });
  }
});

// GET COMMENTS OF A POST
router.get("/:postId", async (req, res) => {
  try {
    const comments = await Comment.find({
      post: req.params.postId,
    })
      .populate("user", "username profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch comments",
      error: error.message,
    });
  }
});

// DELETE COMMENT
router.delete("/:commentId", async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    await Comment.findByIdAndDelete(req.params.commentId);

    await Post.findByIdAndUpdate(comment.post, {
      $pull: {
        comments: {
          _id: comment._id,
        },
      },
    });

    res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete comment",
      error: error.message,
    });
  }
});

module.exports = router;