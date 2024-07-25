const mongoose = require("mongoose");
const wallpaperSchema = new mongoose.Schema({
  wallpaper_Name: {
    type: String,
  },
  wallpaperImage: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
});

const WallPaper = mongoose.model("Wallpaper", wallpaperSchema);
module.exports = WallPaper;
