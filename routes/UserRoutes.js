const express = require("express");
const multer = require("multer");
const path = require("path");
const passport = require("passport");
const User = require("../model/UserSchema");
const {
  jsonAuthMiddleware,
  generateToken,
  generateVerificationCode,
} = require("../authorization/auth");
const sendVerificationCode = require("../middleware/resendotp");
const router = express.Router();
const {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../validator/validation");
require("dotenv").config();
require("./passport");

// Multer configuration for file storage
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

// Register route
router.post(
  "/register",
  upload.single("profile_picture"),
  validateRegistration,
  async (req, res) => {
    const { name, email, phone_number, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({
          error: true,
          message:
            "Passwords do not match. Please ensure both passwords are the same.",
        });
    }

    try {
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({
            error: true,
            message:
              "An account with this email already exists. Please log in.",
          });
      }
      let data = await User.findOne({ phone_number });
      if (data) {
        return res
          .status(400)
          .json({
            error: true,
            message: "This phone number is already associated with an account.",
          });
      }

      // Save user and respond with success message
      const profile_picture = req.file ? req.file.filename : "";
      user = new User({ name, email, password, phone_number, profile_picture });
      await user.save();

      const token = generateToken(user);
      res
        .status(200)
        .json({ error: false, message: "Registration successful!", token });
    } catch (err) {
      console.error("Registration error: ", err);
      res
        .status(500)
        .json({
          error: true,
          message:
            "An error occurred while processing your registration. Please try again.",
        });
    }
  }
);

// Login route
router.post("/login", validateLogin, async (req, res) => {
  const { identifier, password } = req.body;

  try {
    let user;
    const isEmail = identifier.includes("@");

    if (isEmail) {
      user = await User.findOne({ email: identifier });
    } else {
      user = await User.findOne({ phone_number: identifier });
    }

    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({
          error: true,
          message:
            "Incorrect email/phone number or password. Please try again.",
        });
    }

    const token = generateToken(user);
    res.status(200).json({ error: false, message: "Login successful!", token });
  } catch (err) {
    console.error("Login error: ", err);
    res
      .status(500)
      .json({
        error: true,
        message: "An error occurred during login. Please try again later.",
      });
  }
});
// Get all users
router.get("/contacts", jsonAuthMiddleware, async (req, res) => {
  try {
    const contacts = await User.find({
      _id: { $ne: req.user.userData._id },
    }).sort({
      name: 1,
    });
    res.status(200).json({ data: contacts });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

//Get Single User By Id
router.get("/user/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await User.findById(id);
    if (!data) {
      res.status(404).json({ msg: "User Not Found" });
    }
    res.status(200).json({ data: data, status: true });
  } catch (error) {}
});
// Get a single profile
router.get("/profile", jsonAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.userData._id;
    const singleUser = await User.findById(userId);

    if (!singleUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(singleUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Edit user details
router.put(
  "/editUser",
  jsonAuthMiddleware,
  upload.single("profile_picture"),
  async (req, res) => {
    try {
      const userId = req.user.userData._id;
      const updates = req.body;

      if (req.file) {
        updates.profile_picture = req.file.filename; // Update profile picture if new one is uploaded
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updates, {
        new: true,
        runValidators: true,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ updatedUser, msg: "User Updated Succesfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete user
router.get("/deleteUser", jsonAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.userData._id;
    const deleteUser = await User.findByIdAndDelete(userId);
    if (!deleteUser) {
      return res.status(404).json({ message: "User Not Found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

router.post("/forgot-password", validateForgotPassword, async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Generate a verification code
    const verificationCode = generateVerificationCode();
    const expiryTime = Date.now() + 60000; // 60 seconds (1 minute) from now

    // Save the verification code and expiry time to the user's record
    user.resetPasswordCode = verificationCode;
    user.resetPasswordExpires = expiryTime;
    await user.save();

    // Send the verification code to the user's email
    await sendVerificationCode(user.email, verificationCode);

    res.status(200).json({ msg: "Verification code sent to email" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

// Reset Password route
router.post("/reset-password", validateResetPassword, async (req, res) => {
  const { email, verificationCode, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    // Verify the code and check if it has expired
    if (
      user.resetPasswordCode !== verificationCode ||
      Date.now() > user.resetPasswordExpires
    ) {
      return res
        .status(400)
        .json({ msg: "Invalid or expired verification code" });
    }

    // Update the user's password
    user.password = newPassword;
    user.resetPasswordCode = undefined; // Clear the reset code
    user.resetPasswordExpires = undefined; // Clear the expiry time
    await user.save();

    res.status(200).json({ msg: "Password reset successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

// Theme Refrence
router.put("'/theme", async (req, res) => {
  try {
    const { userId, themePreference } = req.body;

    if (!["light", "dark", "system_default"].includes(themePreference)) {
      return res.status(400).json({ msg: "Invalid theme preference" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.themePreference = themePreference;
    await user.save();

    res.json({ msg: "Theme preference updated successfully" });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

router.get("/search-users", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ msg: "name query parameter is required" });
    }

    const users = await User.find({
      name: { $regex: meaning, $options: "i" },
    });

    res.status(200).json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

// Google Authentication Route
// router.get(
//   "/auth/google",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );

// // Google Authentication Callback Route
// router.get(
//   "/auth/google/callback",
//   passport.authenticate("google", {
//     session: false,
//     failureRedirect: "/login",
//   }),
//   (req, res) => {
//     const token = generateToken(req.user);
//     res.redirect(`http://localhost:3001/auth/google/callback?token=${token}`);
//   }
// );

module.exports = router;
