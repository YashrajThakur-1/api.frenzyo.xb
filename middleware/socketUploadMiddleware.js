const multer = require("multer");
const path = require("path");

// Set up storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Directory to save the files
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Initialize Multer with field configurations
const upload = multer({ storage: multer.memoryStorage() }).fields([
  { name: "documents", maxCount: 10 },
  { name: "photos", maxCount: 10 },
]);

module.exports = upload;
