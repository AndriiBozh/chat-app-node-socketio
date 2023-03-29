const mongoose = require("mongoose");

const { Schema } = mongoose;

const messageSchema = new Schema({
  message: {
    type: String,
    required: true,
    trim: true,
    min: [3, "Message should be longer than 2 characters"],
    max: [200, "Your message is too long"],
  },
  createdAt: { type: String },
  publishedInRoom: { type: String },
  author: { type: String },
  addressee: { type: String },
  private: { type: Boolean, default: false },
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
