const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");

// GET USER NOTIFICATIONS
router.get("/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.params.userId,
    })
      .populate("sender", "username profilePicture")
      .populate("post", "image")
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Notification Error:", error);

    res.status(500).json({
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

// CREATE NOTIFICATION
router.post("/", async (req, res) => {
  try {
    const {
      recipient,
      sender,
      type,
      post,
      message,
    } = req.body;

    if (!recipient || !sender || !type) {
      return res.status(400).json({
        message: "Recipient, sender and type are required",
      });
    }

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      post: post || null,
      message: message || "",
    });

    const newNotification = await Notification.findById(
      notification._id
    )
      .populate("sender", "username profilePicture")
      .populate("post", "image");

    res.status(201).json({
      message: "Notification created successfully",
      notification: newNotification,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create notification",
      error: error.message,
    });
  }
});

// MARK ONE NOTIFICATION AS READ
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update notification",
      error: error.message,
    });
  }
});

// MARK ALL NOTIFICATIONS AS READ
router.put("/read-all/:userId", async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.params.userId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update notifications",
      error: error.message,
    });
  }
});

// DELETE NOTIFICATION
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(
      req.params.id
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.status(200).json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete notification",
      error: error.message,
    });
  }
});

module.exports = router;