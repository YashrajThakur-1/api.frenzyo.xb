const express = require("express");
const router = express.Router();
const Message = require("../model/MessageSchema");
const Group = require("../model/GroupSchema");
const { jsonAuthMiddleware } = require("../authorization/auth");
const upload = require("../middleware/multer");

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
    console.log("Error is", error);
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
      console.log("Error is", error);
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
    console.log("Error is", error);
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
      console.log("Error is", error);
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
      console.log("Error is", error);
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
      console.log("Error is", error);
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
      console.log("Error is", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete all messages from a specific receiver
router.delete(
  "/message/receiver/:receiverId",
  jsonAuthMiddleware,
  async (req, res) => {
    const { receiverId } = req.params;
    try {
      const messages = await Message.find({ receiver: receiverId });
      if (messages.length === 0) {
        return res
          .status(404)
          .json({ message: "No messages found for this receiver" });
      }
      for (const message of messages) {
        await message.remove();
      }
      res
        .status(200)
        .json({ message: "User removed from chat list and messages deleted" });
    } catch (error) {
      console.log("Error is", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Create a new group
router.post("/group", jsonAuthMiddleware, async (req, res) => {
  try {
    const group = new Group({ ...req.body });
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    console.log("Error is", error);
    res.status(500).json({ message: error.message });
  }
});

// Get group by ID
router.get("/group/:groupId", jsonAuthMiddleware, async (req, res) => {
  const { groupId } = req.params;
  try {
    const group = await Group.findById(groupId).populate("messages");
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    res.status(200).json(group);
  } catch (error) {
    console.log("Error is", error);
    res.status(500).json({ message: error.message });
  }
});

// Get group messages by group ID
router.get("/group/:groupId/messages", jsonAuthMiddleware, async (req, res) => {
  const { groupId } = req.params;
  try {
    const group = await Group.findById(groupId).populate({
      path: "messages",
      populate: {
        path: "sender receiver",
        select: "name email",
      },
    });
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    res.status(200).json(group.messages);
  } catch (error) {
    console.log("Error is", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
