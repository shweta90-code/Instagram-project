const express = require("express");
const router = express.Router();

const Post = require("../models/Post");


// CREATE POST
router.post("/", async (req, res) => {
  try {
    const { user, image, caption } = req.body;

    if (!user || !image) {
      return res.status(400).json({
        message: "User and image are required",
      });
    }

    const post = await Post.create({
      user,
      image,
      caption: caption || "",
    });

    const newPost = await Post.findById(post._id)
      .populate("user", "username profilePicture");

    res.status(201).json({
      message: "Post created successfully",
      post: newPost,
    });
  } catch (error) {
    console.error("Create Post Error:", error);

    res.status(500).json({
      message: "Failed to create post",
      error: error.message,
    });
  }
});


// GET ALL POSTS
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "username profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Fetch Posts Error:", error);

    res.status(500).json({
      message: "Failed to fetch posts",
      error: error.message,
    });
  }
});


// GET POSTS OF A USER
router.get("/user/:userId", async (req, res) => {
  try {
    const posts = await Post.find({
      user: req.params.userId,
    })
      .populate("user", "username profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user posts",
      error: error.message,
    });
  }
});


// GET SINGLE POST
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "username profilePicture");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch post",
      error: error.message,
    });
  }
});


// UPDATE POST
router.put("/:id", async (req, res) => {
  try {
    const { image, caption } = req.body;

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        image,
        caption,
      },
      {
        new: true,
      }
    ).populate("user", "username profilePicture");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    res.status(200).json({
      message: "Post updated successfully",
      post,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update post",
      error: error.message,
    });
  }
});


// DELETE POST
router.delete("/:id", async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete post",
      error: error.message,
    });
  }
});


module.exports = router;