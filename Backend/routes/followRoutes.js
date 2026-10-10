const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Follow = require("../models/Follow");

// FOLLOW / UNFOLLOW USER
router.post("/:userId", async (req, res) => {
  try {
    const { followerId } = req.body;
    const followingId = req.params.userId;

    if (!followerId) {
      return res.status(400).json({
        message: "Follower ID is required",
      });
    }

    if (followerId === followingId) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    const follower = await User.findById(followerId);
    const following = await User.findById(followingId);

    if (!follower || !following) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: followingId,
    });

    if (existingFollow) {
      await Follow.findByIdAndDelete(existingFollow._id);

      follower.following = follower.following.filter(
        (id) => id.toString() !== followingId.toString()
      );

      following.followers = following.followers.filter(
        (id) => id.toString() !== followerId.toString()
      );

      await follower.save();
      await following.save();

      return res.status(200).json({
        message: "User unfollowed successfully",
        following: false,
      });
    }

    await Follow.create({
      follower: followerId,
      following: followingId,
    });

    if (
      !follower.following.some(
        (id) => id.toString() === followingId.toString()
      )
    ) {
      follower.following.push(followingId);
    }

    if (
      !following.followers.some(
        (id) => id.toString() === followerId.toString()
      )
    ) {
      following.followers.push(followerId);
    }

    await follower.save();
    await following.save();

    res.status(200).json({
      message: "User followed successfully",
      following: true,
    });
  } catch (error) {
    console.error("Follow Error:", error);

    res.status(500).json({
      message: "Follow operation failed",
      error: error.message,
    });
  }
});

// GET FOLLOWERS
router.get("/:userId/followers", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("followers")
      .populate("followers", "username email profilePicture bio");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json(user.followers);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get followers",
      error: error.message,
    });
  }
});

// GET FOLLOWING
router.get("/:userId/following", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("following")
      .populate("following", "username email profilePicture bio");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json(user.following);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get following users",
      error: error.message,
    });
  }
});

module.exports = router;