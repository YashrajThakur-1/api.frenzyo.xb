const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
    },
    contact_company: { type: String },
    saved_userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contact_phone_number: {
      type: String,
      required: true,
    },
    contact_email: {
      type: String,
    },
    contact_picture: {
      type: String,
    },
    birthday: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Contact = mongoose.model("Contact", contactSchema);

module.exports = Contact;
