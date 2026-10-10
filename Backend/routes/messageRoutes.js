const express = require("express");
const router = express.Router();

const Message = require("../models/Message");

// SEND MESSAGE
router.post("/", async (req, res) => {
  try {
    const { sender, receiver, message } = req.body;

    if (!sender || !receiver || !message || !message.trim()) {
      return res.status(400).json({
        message: "Sender, receiver and message are required",
      });
    }

    const newMessage = await Message.create({
      sender,
      receiver,
      message: message.trim(),
    });

    const savedMessage = await Message.findById(newMessage._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");

    res.status(201).json({
      message: "Message sent successfully",
      data: savedMessage,
    });
  } catch (error) {
    console.error("Send Message Error:", error);

    res.status(500).json({
      message: "Failed to send message",
      error: error.message,
    });
  }
});

// GET CHAT BETWEEN TWO USERS
router.get("/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    const messages = await Message.find({
      $or: [
        {
          sender: user1,
          receiver: user2,
        },
        {
          sender: user2,
          receiver: user1,
        },
      ],
    })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

// MARK MESSAGES AS READ
router.put("/read/:senderId/:receiverId", async (req, res) => {
  try {
    await Message.updateMany(
      {
        sender: req.params.senderId,
        receiver: req.params.receiverId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.status(200).json({
      message: "Messages marked as read",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
});

// DELETE MESSAGE
router.delete("/:id", async (req, res) => {
  try {
    const deletedMessage = await Message.findByIdAndDelete(
      req.params.id
    );

    if (!deletedMessage) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    res.status(200).json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete message",
      error: error.message,
    });
  }
});

module.exports = router;