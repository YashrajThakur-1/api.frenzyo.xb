const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define schemas for shareable items
const photoSchema = new Schema({
  fileName: String,
  fileSize: Number,
  url: String,
  isLocal: {
    type: Boolean,
    default: false,
  },
  timestamp: { type: Date, default: Date.now },
});

const documentSchema = new Schema({
  name: String,
  type: String,
  size: Number,
  uri: String,
  isLocal: {
    type: Boolean,
    default: false,
  },
  timestamp: { type: Date, default: Date.now },
});

const pollOptionSchema = new Schema({
  option: String,
  isLocal: {
    type: Boolean,
    default: false,
  },
  votes: { type: Number, default: 0 },
});

const pollSchema = new Schema({
  question: String,
  isLocal: {
    type: Boolean,
    default: false,
  },
  options: [pollOptionSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  responses: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

const contactSchema = new Schema({
  name: String,
  email: String,
  isLocal: {
    type: Boolean,
    default: false,
  },
  phoneNumber: String,
  profilePicture: String,
  address: String,
  location: {
    latitude: Number,
    longitude: Number,
  },
  sharedAt: { type: Date, default: Date.now },
});

// Define main message schema
const messageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String },
  file_message: { type: String },
  sentAt: { type: Date, default: Date.now },
  photos: [photoSchema],
  documents: [documentSchema],
  polls: [pollSchema],
  contacts: [contactSchema],
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
