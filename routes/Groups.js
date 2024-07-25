const express = require("express");
const router = express.Router();

const Message = require("../model/MessageSchema");
const { jsonAuthMiddleware } = require("../authorization/auth");
const Group = require("../model/GroupSchema");

// Create a new group
router.post("/", jsonAuthMiddleware, async (req, res) => {
  try {
    const group = new Group({ ...req.body });
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get group by ID
router.get("/:groupId", jsonAuthMiddleware, async (req, res) => {
  const { groupId } = req.params;
  try {
    const group = await Group.findById(groupId).populate("messages");
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get group messages by group ID
router.get("/:groupId/messages", jsonAuthMiddleware, async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
