const express = require("express");
const router = express.Router();
const multer = require("multer");
const WallPaper = require("../model/WallpaperSchema");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage });
router.post(
  "/addWallpaper",
  upload.single("wallpaperImage"),
  async (req, res) => {
    try {
      const { wallpaper_Name, active } = req.body;
      const wallpaperImage = req.file ? req.file.filename : "";
      const wallpaper = await WallPaper({
        wallpaper_Name,
        wallpaperImage,
        active,
      });
      await wallpaper.save();
      res.status(200).json({ msg: "Wallpaper Addes Succesfully" });
    } catch (error) {
      console.log("Error adding on wallpaper", error);
      res.status(500).json({ err: "Internal Server Error" });
    }
  }
);

router.get("/Wallpapers", async (req, res) => {
  try {
    const data = await WallPaper.find();
    if (!data) {
      res.status(404).json({ msg: "Wallpaper Not Found" });
    }
    if (!data.length === 0) {
      res.status(404).json({ msg: "Wallpaper Not Found" });
    }
    console.log("data?>>>>>>>>>", data);
    res.status(200).json({ data: data, status: true });
  } catch (error) {
    console.log("Error getting on wallpaper", error);
    res.status(500).json({ err: "Internal Server Error" });
  }
});

//
router.get("/wallpaper/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await WallPaper.findById(id);
    if (!data) {
      res.status(404).json({ msg: "WallPaper Not Found" });
    }
    res.status(200).json({ data: data, status: true });
  } catch (error) {}
});
module.exports = router;
