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

// Route to add a new story
router.post(
  "/addStory",
  jsonAuthMiddleware,
  upload.single("media"),
  async (req, res) => {
    try {
      const currentUserId = req.user.userData._id;
      const { caption, text } = req.body;
      const mediaPath = req.file ? req.file.path : null;

      console.log("Current User ID:", currentUserId);
      console.log("Caption:", caption);
      console.log("Text:", text);
      console.log("Media Path:", mediaPath);

      if (!mediaPath) {
        console.log("Media file is required");
        return res.status(400).json({ message: "Media file is required" });
      }

      let fileBuffer;
      try {
        fileBuffer = fs.readFileSync(path.resolve(mediaPath));
        console.log("File read successfully");
      } catch (error) {
        console.error("File read error:", error);
        return res.status(500).json({ message: "Error reading media file" });
      }

      const fileType = await import("file-type");
      const mime = await fileType.fileTypeFromBuffer(fileBuffer);

      if (!mime) {
        console.log("Unable to determine file type");
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
        console.log("Unsupported file type:", mime.mime);
        return res.status(400).json({ message: "Unsupported file type" });
      }

      console.log("Media Type:", mediaType);

      const story = new Story({
        user: currentUserId,
        media: [{ url: req.file.filename, type: mediaType }],
        caption: caption,
        text: text,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      });

      await story.save();
      console.log("Story saved successfully:", story);
      res.status(201).json(story);
    } catch (error) {
      console.error("Error adding story:", error);
      res.status(500).json({ message: "Error adding story" });
    }
  }
);

// Route to delete a story
router.delete("/stories/:id", jsonAuthMiddleware, async (req, res) => {
  try {
    const storyId = req.params.id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (story.user.toString() !== req.user.userData._id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this story" });
    }

    if (story.media.length > 0) {
      const mediaPath = path.join("uploads", story.media[0].url);
      if (fs.existsSync(mediaPath)) {
        fs.unlinkSync(mediaPath);
      }
    }

    await Story.findByIdAndDelete(storyId);
    res.status(200).json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting story" });
  }
});

// Route to increment view count of a story
router.post("/stories/:id/view", jsonAuthMiddleware, async (req, res) => {
  try {
    const storyId = req.params.id;
    const viewerId = req.user.userData._id;
    const viewerUsername = req.user.userData.name;
    const viewerPhoneNumber = req.user.userData.phone_number;

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
        phone_number: viewerPhoneNumber,
      });
      await story.save();
    }

    res.status(200).json({ message: "View count incremented", story });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error incrementing view count" });
  }
});

// Route to get a specific story by ID
router.get("/stories/:id", jsonAuthMiddleware, async (req, res) => {
  try {
    const storyId = req.params.id;
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

// Route to get all stories with the current user's latest stories first
router.get("/stories", jsonAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.userData._id;
    const stories = await Story.find()
      .sort({ createdAt: -1 })
      .populate("user", "username"); // Populate user details

    const sortedStories = stories.sort((a, b) => {
      if (a.user._id.equals(userId) && !b.user._id.equals(userId)) return -1;
      if (!a.user._id.equals(userId) && b.user._id.equals(userId)) return 1;
      return 0;
    });

    res.status(200).json(sortedStories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching stories" });
  }
});

module.exports = router;
