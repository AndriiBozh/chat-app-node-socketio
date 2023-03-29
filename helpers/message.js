const { currentTime } = require("./time");
const Message = require("../db/schemas/messages");

const createPublicMessage = (message, author, addressee, publishedInRoom) => {
  const publicMessage = new Message({
    message: message,
    author: author,
    addressee: addressee,
    publishedInRoom: publishedInRoom,
    createdAt: currentTime(),
  });
  return publicMessage;
};

const createPrivateMessage = (message, author, addressee, room, isPrivate) => {
  const privateMessage = new Message({
    message: message,
    author: author,
    addressee: addressee,
    room: room,
    private: isPrivate,
    createdAt: currentTime(),
  });
  return privateMessage;
};

const generateMessage = (author, message, addressee) => {
  return {
    author,
    message,
    addressee: addressee || "",
    createdAt: currentTime(),
  };
};

const getMessagesFromCurrentRoom = (room) => {
  const messages = Message.find({
    publishedInRoom: room,
    private: false,
  })
    .sort({ _id: -1 })
    .limit(2);
  return messages;
};

module.exports = {
  createPublicMessage,
  createPrivateMessage,
  generateMessage,
  getMessagesFromCurrentRoom,
};
