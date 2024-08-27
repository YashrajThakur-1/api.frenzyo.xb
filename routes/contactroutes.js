const { jsonAuthMiddleware } = require("../authorization/auth");
const Contact = require("../model/contactmodel");
const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
router.post(
  "/add-contact",
  upload.single("contact_picture"),
  jsonAuthMiddleware,
  async (req, res) => {
    const {
      first_name,
      surname,
      contact_phone_number,
      contact_email,
      birthday,
    } = req.body;
    const userId = req.user.userData._id;
    const contact_picture = req.file ? req.file.filename : "";
    try {
      const user = await Contact({
        first_name,
        saved_userid: userId,
        surname,
        contact_phone_number,
        contact_email,
        contact_picture: contact_picture,
        birthday,
      });

      await user.save();

      res.status(200).json({ msg: `${user.first_name} saved` });
    } catch (error) {
      console.log("Error adding on Contact", error);
      res.status(500).json({ msg: "Internal Server Error" });
    }
  }
);

router.get("/", jsonAuthMiddleware, async (req, res) => {
  try {
    const saved_userid = req.user.userData._id;
    const isContact = await Contact.findById({ saved_userid });
    if (!isContact) {
      res.status(404).json({ msg: "User Not Found" });
    }
    res.status(200).json({ data: isContact });
  } catch (error) {
    console.log("Error adding on Contact", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});
router.get("/:id", jsonAuthMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const GetSingleContact = await Contact.findById({ _id: id });
    if (!GetSingleContact) {
      res.status(404).json({ msg: "User Not Found" });
    }
    res.status(200).json({ data: GetSingleContact });
  } catch (error) {
    console.log("Error adding on Contact", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

router.put("/update_contacts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    if (req.file) {
      updates.contact_picture = req.file ? req.file.filename : "";
    }
    const updatedUser = await Contact.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!updatedUser) {
      res.status(200).json({ data: "Contact Not found" });
    }
    res.status(200).json({ updatedUser, msg: "Contact Updated Succesfully" });
  } catch (error) {
    console.log("Error adding on Contact", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

router.get("/delete_contacts/:id", jsonAuthMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const deleteUser = await Contact.findByIdAndDelete(userId);
    if (!deleteUser) {
      return res.status(404).json({ message: "User Not Found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

module.exports = router;
