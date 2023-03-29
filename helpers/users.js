const User = require("../db/schemas/users");

const { currentTime } = require("./time");

const createUser = (name, gender, password, room) => {
  const newUser = new User({
    name: name,
    gender: gender,
    password: password,
    room: room,
  });
  return newUser;
};

const findUser = (name) => {
  const user = User.findOne({ name: name });
  return user;
};

const updateUser = (name, room) => {
  const updatedUser = User.findOneAndUpdate(
    { name: name },
    { room: room, online: true },
    { returnDocument: "after" }
  );
  return updatedUser;
};

const getCurrentUser = (name, chatId) => {
  const currentUser = User.findOneAndUpdate(
    { name: name },
    { chatId: chatId },
    { returnDocument: "after" }
  );
  return currentUser;
};

const getUsersInRoom = (room) => {
  const usersOnline = User.find({
    room: room,
    online: true,
  }).sort({ name: 1 });
  return usersOnline;
};

const getUsersFromFormerRoom = (room, userId) => {
  const usersInFormerRoom = User.find({
    room: room,
    online: true,
    _id: { $nin: userId },
  }).sort({ name: 1 });
  return usersInFormerRoom;
};

const updateUserRoom = (name, room) => {
  const currentUser = User.findOneAndUpdate(
    { name: name },
    { room: room },
    { returnDocument: "after" }
  );
  return currentUser;
};

const updateUserToOffline = (chatId) => {
  const userLeft = User.findOneAndUpdate(
    { chatId: chatId },
    { online: false, lastSeen: currentTime() },
    { returnDocument: "after" }
  );
  return userLeft;
};

module.exports = {
  createUser,
  findUser,
  updateUser,
  getCurrentUser,
  getUsersInRoom,
  getUsersFromFormerRoom,
  updateUserRoom,
  updateUserToOffline,
};
