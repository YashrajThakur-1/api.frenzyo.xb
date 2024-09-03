const express = require("express");
const router = express.Router();
const Message = require("../model/MessageSchema");
const Group = require("../model/GroupSchema");
const { jsonAuthMiddleware } = require("../authorization/auth");
const upload = require("../middleware/multer");
const User = require("../model/UserSchema");

// Create a new message
router.post("/message", jsonAuthMiddleware, async (req, res) => {
  const { message, receiver, photos, documents, polls, contacts } = req.body;
  try {
    const newMessage = new Message({
      message,
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

router.get("/message", jsonAuthMiddleware, async (req, res) => {
  const userId = req.user.userData._id;
  try {
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    }).sort("sentAt");
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error is", error);
    res.status(500).json({ message: error.message });
  }
});

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
  "/message/:receiverId/photos",
  jsonAuthMiddleware,
  upload.array("photo", 10),
  async (req, res) => {
    const { receiverId } = req.params;
    const senderId = req.user.userData._id;
    const { file_message } = req.body;

    try {
      // Ensure photos array exists
      const photos = [];
      if (req.files && req.files.length > 0) {
        // Add photos to message.photos
        console.log(req.file);
        req.files.forEach((file) => {
          const photo = {
            fileName: file.filename,
            fileSize: file.size,
            url: file.filename, // Change this to the actual URL if needed
            timestamp: new Date(),
          };
          photos.push(photo);
        });
        const newMessage = new Message({
          file_message: file_message,
          photos: photos,
          receiver: receiverId,
          sender: senderId,
        });
        await newMessage.save();
        return res.status(200).json(newMessage);
      } else {
        return res.status(400).json({ msg: "No files uploaded" });
      }
    } catch (error) {
      console.log("Error is", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Add a document to a message
router.post(
  "/message/:receiverId/documents",
  jsonAuthMiddleware,
  upload.array("documents", 10),
  async (req, res) => {
    const { receiverId } = req.params;
    const senderId = req.user.userData._id;
    const { file_message } = req.body;

    try {
      if (req.files && req.files.length > 0) {
        // Initialize an empty array to store documents
        const documents = [];

        // Iterate over each uploaded file and create a document object
        req.files.forEach((file) => {
          const document = {
            documentName: file.originalname,
            documentType: file.mimetype,
            documentSize: file.size,
            url: file.filename, // Change this to the actual URL if needed
            timestamp: new Date(),
          };
          documents.push(document);
        });

        // Create a new message object
        const newMessage = new Message({
          file_message: file_message,
          documents: documents, // Save the array of documents
          receiver: receiverId,
          sender: senderId, // Set the sender to the logged-in user
        });

        // Save the new message to the database
        await newMessage.save();
        return res.status(200).json(newMessage); // Return the newly created message
      } else {
        return res.status(400).json({ message: "No files uploaded" });
      }
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
// Get a list of users with whom the user has chatted, sorted by the latest message
router.get("/chats", jsonAuthMiddleware, async (req, res) => {
  const userId = req.user.userData._id;
  try {
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender", "name email profile_picture google_image_url")
      .populate("receiver", "name email profile_picture google_image_url ")
      .sort("-sentAt"); // Sort by latest message first

    // Create a map to store the latest message for each user
    const chatMap = new Map();

    messages.forEach((message) => {
      const otherUser =
        message.sender._id.toString() === userId.toString()
          ? message.receiver
          : message.sender;

      // If this user already exists in the map, check if this message is newer
      if (
        !chatMap.has(otherUser._id.toString()) ||
        chatMap.get(otherUser._id.toString()).sentAt < message.sentAt
      ) {
        chatMap.set(otherUser._id.toString(), {
          user: otherUser,
          latestMessage: message,
        });
      }
    });

    // Convert the map to an array and sort by the latest message timestamp
    const chatList = Array.from(chatMap.values()).sort(
      (a, b) => b.latestMessage.sentAt - a.latestMessage.sentAt
    );
    console.log("CHatttttt>>>>>", chatList); // Corrected typo
    res.status(200).json(chatList);
  } catch (error) {
    console.log("Error is", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
