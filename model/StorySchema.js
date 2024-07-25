const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["image", "video"],
    required: true,
  },
});

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    media: {
      type: [mediaSchema],
    },
    text: String,
    caption: String,
    views: { type: Number, default: 0 },
    viewers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: { type: String, required: true },
        phone_number: { type: String },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    finish: {
      type: String,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => Date.now() + 24 * 60 * 60 * 1000, // Default expiration time is 24 hours from creation
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Story = mongoose.model("Story", storySchema);

module.exports = Story;
