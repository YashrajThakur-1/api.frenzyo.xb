const express = require("express");
const mongoose = require("mongoose");
const { jsonAuthMiddleware } = require("../authorization/auth");
const multer = require("multer");
const fs = require("fs");
const User = require("../model/UserSchema");
const Story = require("../model/StorySchema");
const path = require("path");
const router = express.Router();

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Directory to save uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // Save file with a timestamp
  },
});

const upload = multer({ storage: storage });

router.post(
  "/stories",
  jsonAuthMiddleware,
  upload.single("media"),
  async (req, res) => {
    try {
      console.log("req.user", req.user);

      const currentUserId = req.user.userData._id;
      const { caption, text } = req.body;
      const mediaPath = req.file ? req.file.filename : null; // Fix the file path
      console.log("req.file", req.file);
      if (!mediaPath) {
        return res.status(400).json({ message: "Media file is required" });
      }

      const fileBuffer = fs.readFileSync(mediaPath);
      const fileType = await import("file-type");
      const mime = await fileType.fileTypeFromBuffer(fileBuffer);
      console.log("Detected MIME type:", mime);

      if (!mime) {
        return res
          .status(400)
          .json({ message: "Unable to determine file type" });
      }

      let mediaType = "";
      if (mime.mime.startsWith("image/")) {
        mediaType = "image";
      } else if (mime.mime.startsWith("video/")) {
        mediaType = "video";
      } else {
        return res.status(400).json({ message: "Unsupported file type" });
      }

      const story = new Story({
        user: currentUserId,
        media: [{ url: req.file.filename, type: mediaType }], // Save only the filename
        caption: caption,
        text: text,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      });

      await story.save();

      res.status(201).json(story);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error adding story" });
    }
  }
);

// Get all stories and show the current user's latest stories first
router.delete("/stories/:id", jsonAuthMiddleware, async (req, res) => {
  try {
    const storyId = req.params.id;

    // Find the story to delete
    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Delete the media file from the filesystem
    if (story.media.length > 0) {
      const mediaPath = path.join("uploads", story.media[0].url);
      if (fs.existsSync(mediaPath)) {
        fs.unlinkSync(mediaPath); // Delete the file
      }
    }

    // Delete the story from the database
    await Story.findByIdAndDelete(storyId);

    res.status(200).json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting story" });
  }
});

// stories.js
router.post("/stories/:id/view", jsonAuthMiddleware, async (req, res) => {
  try {
    const storyId = req.params.id;
    const viewerId = req.user.userData._id;
    const viewerUsername = req.user.userData.username;
    const viewerMobile_number = req.user.userData.phone_number;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    const alreadyViewed = story.viewers.some((viewer) =>
      viewer.userId.equals(viewerId)
    );
    if (!alreadyViewed) {
      story.views += 1;
      story.viewers.push({
        userId: viewerId,
        username: viewerUsername,
        phone_number: viewerMobile_number,
      });
      await story.save();
    }

    res.status(200).json({ message: "View count incremented", story });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error incrementing view count" });
  }
});
router.get("/stories/:id", jsonAuthMiddleware, async (req, res) => {
  try {
    const storyId = req.params.id;

    // Find the story by ID
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    res.status(200).json(story);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching story" });
  }
});
module.exports = router;
