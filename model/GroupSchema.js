const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const groupSchema = new Schema({
  groupName: { type: String, required: true },
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  messages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
});

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
