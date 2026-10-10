const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const Story = require("../models/Story");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      uniqueName + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// CREATE STORY
// CREATE STORY
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { user, caption } = req.body;

    const image = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    if (!user || !image) {
      return res.status(400).json({
        message: "User and image are required",
      });
    }

    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    const story = await Story.create({
      user,
      image,
      caption: caption || "",
      expiresAt,
    });

    const newStory = await Story.findById(story._id).populate(
      "user",
      "username profilePicture"
    );

    res.status(201).json({
      message: "Story created successfully",
      story: newStory,
    });
  } catch (error) {
    console.error("Create Story Error:", error);

    res.status(500).json({
      message: "Failed to create story",
      error: error.message,
    });
  }
});

// GET ACTIVE STORIES
router.get("/", async (req, res) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(stories);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch stories",
      error: error.message,
    });
  }
});
// GET SINGLE STORY
router.get("/:id", async (req, res) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      expiresAt: { $gt: new Date() }
    }).populate(
      "user",
      "username profilePicture"
    );

    if (!story) {
      return res.status(404).json({
        message: "Story not found or expired"
      });
    }

    res.status(200).json(story);

  } catch (error) {
    console.error(
      "Get Single Story Error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch story",
      error: error.message
    });
  }
});
// GET USER STORIES
router.get("/user/:userId", async (req, res) => {
  try {
    const stories = await Story.find({
      user: req.params.userId,
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json(stories);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user stories",
      error: error.message,
    });
  }
});

// VIEW STORY
router.put("/:id/view", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        message: "Story not found",
      });
    }

    if (!story.viewers.some((id) => id.toString() === userId)) {
      story.viewers.push(userId);
      await story.save();
    }

    res.status(200).json({
      message: "Story viewed successfully",
      viewers: story.viewers,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to view story",
      error: error.message,
    });
  }
});

// DELETE STORY
router.delete("/:id", async (req, res) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);

    if (!story) {
      return res.status(404).json({
        message: "Story not found",
      });
    }

    res.status(200).json({
      message: "Story deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete story",
      error: error.message,
    });
  }
});

module.exports = router;