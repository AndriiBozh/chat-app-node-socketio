const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const { currentTime } = require("../../helpers/time");

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    chatId: { type: String },
    name: {
      type: String,
      required: true,
      trim: true,
      min: [3, "Name is too short"],
      max: [20, "Name is too long"],
    },
    gender: { type: String, required: true },
    createdAt: { type: String, default: currentTime() },
    password: {
      type: String,
      required: true,
      min: [7, "Password should be longer than 6 characters"],
    },
    image: { data: Buffer, type: String },
    admin: { type: Boolean, default: false },
    online: { type: Boolean, default: true },
    chatId: { type: String },
    room: { type: String },
    lastSeen: { type: String },
  },

  {
    methods: {
      validatePassword(data) {
        return bcrypt.compare(data, this.password);
      },
    },
  }
);

userSchema.pre("save", async function (next) {
  try {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  } catch (err) {
    return next(err);
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;
