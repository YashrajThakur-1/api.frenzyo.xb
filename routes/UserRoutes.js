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
    const {
      name,
      email,
      phone_number,
      password,
      confirmPassword,
      bio,
      google_image_url,
      googleId,
      facebookId,
      appleId,
    } = req.body;

    if (!googleId && password !== confirmPassword) {
      return res
        .status(400)
        .json({ msg: "Passwords and confirmPassword do not match" });
    }

    try {
      // Check if user already exists by email
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: "User already exists" });
      }

      // Check if phone number already exists
      let data = await User.findOne({ phone_number });
      if (data) {
        return res.status(400).json({ msg: "Phone number already exists" });
      }

      // Get profile picture path if uploaded
      const profile_picture = req.file ? req.file.filename : "";

      // Create new user instance
      user = new User({
        name,
        email,
        phone_number,
        bio,
        googleId,
        google_image_url,
        facebookId,
        appleId,
        profile_picture,
      });

      // Only set password if googleId is not provided (regular signup)
      if (!googleId) {
        user.password = password;
      }

      // Save user to database (will trigger the password hashing middleware)
      await user.save();

      // Generate JWT token
      console.log("User>>>>>>>>", user);
      const token = generateToken(user);
      console.log("Token>>>>>>>", token);

      res
        .status(200)
        .json({ msg: "User Registration Successfully", user, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Internal Server Error" });
    }
  }
);

router.post("/login", validateLogin, async (req, res) => {
  const { identifier, password } = req.body;

  try {
    let user;

    // Check if identifier is an email or phone number
    const isEmail = identifier.includes("@");

    if (isEmail) {
      user = await User.findOne({ email: identifier });
    } else {
      user = await User.findOne({ phone_number: identifier });
    }

    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ message: "Invalid email/phone number or password" });
      console.log("Invalid email/phone number or password");
    }
    console.log("User Succesfull Login", user);
    const token = generateToken(user);
    res
      .status(200)
      .json({ msg: "User Login Successfully", user: user, token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

router.post("/loginwithgoogle", async (req, res) => {
  const { email, googleId } = req.body;
  console.log("Email >>>", email);
  console.log("Google Idddddddddd>>>>", googleId);
  // Validate input
  if (!email || !googleId) {
    return res
      .status(400)
      .json({ message: "Email and Google ID are required" });
  }

  try {
    // Find the user by email and googleId
    let user = await User.findOne({ email, googleId });

    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: "Invalid email or Google ID" });
    }

    console.log("User Successful Login", user);

    // Generate JWT token
    const token = generateToken(user);

    // Respond with success and token
    res.status(200).json({ msg: "User Login Successfully", user, token });
  } catch (err) {
    console.error(err.message || err);
    res.status(500).json({ msg: "Internal Server Error" });
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
    s;
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
router.post("/verifyuser", async (req, res) => {
  const { email, otp } = req.body;
  console.log("Email>>>>>>>>>>>>", req.body);

  try {
    const user = await User.findOne({ email });
    console.log("user Data>>>>>>>>", user);
    console.log("user Expires Date>>>>>>>>", user.resetPasswordExpires);
    console.log("user Otp >>>>>>>>", user.resetPasswordCode);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if OTP matches and if it is not expired
    if (user.resetPasswordCode !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ error: "Expired OTP" });
    }

    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res
      .status(200)
      .json({ message: "Email verified successfully", status: true });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error. Please try again later." });
  }
});

// Resend Otp
router.post("/resendotp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const otp = generateVerificationCode();
    const otpExpires = new Date(Date.now() + 3 * 60 * 1000); // OTP expires in 2 minutes

    user.resetPasswordCode = otp;
    user.resetPasswordExpires = otpExpires;
    await user.save();
    console.log("USerr>>>>>>>>>>", user);
    await sendVerificationCode(email, otp);
    res.status(200).json({
      message: "OTP resent to your email",
      status: true,
    });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error. Please try again later." });
  }
});
// Reset Password route
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Update the user's password
    user.password = newPassword;

    await user.save();

    res.status(200).json({ msg: "Password reset successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

// Theme Refrence
router.put("/theme", jsonAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.userData._id;
    const { themePreference } = req.body;
    console.log("userID");
    if (!["light", "dark", "system_default"].includes(themePreference)) {
      return res.status(400).json({ msg: "Invalid theme preference" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.themePreference = themePreference;
    await user.save();

    res.json({ user: user, msg: "Theme preference updated successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

router.post("/search-users", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ msg: "name query parameter is required" });
    }

    const users = await User.find({
      name: { $regex: meaning, $options: "i" },
    });

    res.status(200).json(users);
  } catch (err) {}
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
