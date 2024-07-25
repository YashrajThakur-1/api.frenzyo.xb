const express = require("express");
const router = express.Router();
const Message = require("../model/MessageSchema.js");
const {
  jsonAuthMiddleware,
  generateToken,
  generateResetToken,
  generateVerificationCode,
} = require("../authorization/auth");
const upload = require("../authorization/multer");

// Middleware to protect routes

// Create a new message
router.post("/message", jsonAuthMiddleware, async (req, res) => {
  const { content, receiver, photos, documents, polls, contacts } = req.body;
  try {
    const newMessage = new Message({
      content,
      receiver,
      sender: req.user.userData._id, // Set the sender to the logged-in user
    });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all messages between two users
router.get(
  "/message/:userId1/:userId2",
  jsonAuthMiddleware,
  async (req, res) => {
    const { userId1, userId2 } = req.params;
    try {
      const messages = await Message.find({
        $or: [
          { sender: userId1, receiver: userId2 },
          { sender: userId2, receiver: userId1 },
        ],
      }).sort("sentAt");
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Get all messages in a group chat
router.get("/message/group/:groupId", jsonAuthMiddleware, async (req, res) => {
  const { groupId } = req.params;
  try {
    const messages = await Message.find({ receiver: groupId }).sort("sentAt");
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a photo to a message
router.post(
  "/message/:messageId/photos",
  jsonAuthMiddleware,
  upload.single("photo"),
  async (req, res) => {
    const { messageId } = req.params;
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      const photo = {
        fileName: req.file.filename,
        fileSize: req.file.size,
        url: req.file.filename,
        timestamp: new Date(),
      };
      message.photos.push(photo);
      await message.save();
      res.status(200).json(message);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Add a document to a message
router.post(
  "/message/:messageId/documents",
  jsonAuthMiddleware,
  upload.single("document"),
  async (req, res) => {
    const { messageId } = req.params;
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      const document = {
        documentName: req.file.originalname,
        documentType: req.file.mimetype,
        documentSize: req.file.size,
        url: req.file.filename,
        timestamp: new Date(),
      };
      message.documents.push(document);
      await message.save();
      res.status(200).json(message);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Add a poll to a message
router.post(
  "/message/:messageId/polls",
  jsonAuthMiddleware,
  async (req, res) => {
    const { messageId } = req.params;
    const poll = req.body;
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      message.polls.push(poll);
      await message.save();
      res.status(200).json(message);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Add a contact to a message
router.post(
  "/message/:messageId/contacts",
  jsonAuthMiddleware,
  async (req, res) => {
    const { messageId } = req.params;
    const contact = req.body;
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      message.contacts.push(contact);
      await message.save();
      res.status(200).json(message);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
