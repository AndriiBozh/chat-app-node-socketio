require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const EventEmitter = require("events");

const eventEmitter = new EventEmitter();

const renderErrorMessage = require("./helpers/errorMsg");
const {
  createPublicMessage,
  createPrivateMessage,
  generateMessage,
  getMessagesFromCurrentRoom,
} = require("./helpers/message");
const {
  createUser,
  findUser,
  updateUser,
  getCurrentUser,
  getUsersInRoom,
  getUsersFromFormerRoom,
  updateUserRoom,
  updateUserToOffline,
} = require("./helpers/users");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;

// start of connect to database

// handle initial connection errors
mongoose.connect(process.env.MONGODB_URL).catch((error) => handleError(error));

//   handle errors after initial connection was established
mongoose.connection.on("error", (err) => {
  logError(err);
});

// end of connect to database

app.use(express.static("public"));
// next two lines are for rendering .html files (from 'views' folder)
app.set("view engine", "html");
app.engine("html", require("ejs").renderFile);

app.use(express.json());
// for data coming from a form
app.use(express.urlencoded({ extended: true }));

// login page, - chat app starts here
app.get("/", (req, res) => {
  res.render("login");
});

app.post("/", async (req, res) => {
  const { username, gender, password, room } = req.body;

  if (!username || !password) {
    const errorMessage = renderErrorMessage("All fields are required");
    return res.send(errorMessage);
  }
  try {
    const userIsInDB = await findUser(username);

    if (!userIsInDB) {
      const newUser = createUser(username, gender, password, room);

      await newUser.save();

      const user = {
        name: newUser.name,
        gender: newUser.gender,
        room: newUser.room,
      };

      eventEmitter.emit("user", user);
      res.render("chat");
    }
    if (userIsInDB) {
      const passwordConfirmed = await userIsInDB.validatePassword(password);

      if (!passwordConfirmed) {
        const errorMessage = renderErrorMessage("Wrong password!");
        return res.send(errorMessage);
      }

      const updatedUser = await updateUser(userIsInDB.name, room);

      const currentRoom = updatedUser.room;

      const user = {
        name: userIsInDB.name,
        gender: userIsInDB.gender,
        room: currentRoom,
      };

      eventEmitter.emit("user", user);

      res.render("chat");
    }
  } catch (err) {
    console.log(err);
    res.render("login");
  }
});

let loggedInUser;
eventEmitter.on("user", (user) => {
  loggedInUser = user;
});

const chatBotName = "chat bot";

io.on("connection", async (socket) => {
  console.log("connected");

  if (!loggedInUser) {
    return console.log("server sais: no logged in user");
  }
  //   we get 'loggedInUser.name' from 'eventEmitter' above
  let currentUser = await getCurrentUser(loggedInUser.name, socket.id);

  // find users from the room the user joins
  const usersOnline = await getUsersInRoom(currentUser.room);
  //   subscribe the socket to a given channel (this will let us emit messages to a specific room)
  socket.join(currentUser.room);

  //   get the last 2 (can be any number; number is set in users.js) public messages from the database
  let messages = await getMessagesFromCurrentRoom(currentUser.room);

  //  send several previos messages (chat history) to the user, which joins the chat
  io.to(currentUser.chatId).emit("previos-messages", messages);

  io.to(currentUser.room).emit(
    "user-joined-chat",
    generateMessage(chatBotName, " joined", currentUser.name),
    usersOnline
  );

  socket.on("room-name", async (roomName) => {
    // do nothing if user remains in the same room (clicks button on the room where they currently in)
    if (currentUser.room !== roomName) {
      // find users except the one leaving the room ===> this will give us list of users which are left in the room to update the list of users
      const usersInFormerRoom = await getUsersFromFormerRoom(
        currentUser.room,
        currentUser._id
      );

      socket.broadcast
        .to(currentUser.room)
        .emit(
          "user-left",
          generateMessage(chatBotName, `${currentUser.name} left`),
          usersInFormerRoom
        );
      socket.leave(currentUser.room);
      socket.join(roomName);

      currentUser = await updateUserRoom(currentUser.name, roomName);

      const usersInCurrentRoom = await getUsersInRoom(roomName);

      messages = await getMessagesFromCurrentRoom(currentUser.room);

      io.to(currentUser.chatId).emit("previos-messages", messages);

      io.to(currentUser.room).emit(
        "join-another-room",
        generateMessage(chatBotName, " joined", currentUser.name),
        usersInCurrentRoom
      );
    }
  });

  //  an event was received from the client
  socket.on("user-message", async (msg, addressee) => {
    const userExists = await findUser(addressee);

    // if 'message-to' field is not empty, but there's no user with such name in the database
    if (addressee && !userExists) {
      return io
        .to(currentUser.chatId)
        .emit(
          "private-message",
          generateMessage(chatBotName, "Unable to send message to this user.")
        );
    }
    const publicMessage = createPublicMessage(
      msg,
      currentUser.name,
      addressee,
      currentUser.room
    );

    const savedPublicMessage = await publicMessage.save();

    //  when user selects his nickname and tries to send message to himself in public window, make sure there's no his nickname (as 'sent to') in front of his message ==> better user experience
    if (addressee === currentUser.name) {
      return io
        .to(currentUser.room)
        .emit("user-message", generateMessage(currentUser.name, msg));
    }

    io.to(currentUser.room).emit(
      "user-message",
      generateMessage(currentUser.name, msg, addressee)
    );
  });

  //   ===== user is typing here (user-is-typing.js) =====

  socket.on("private-message", async (msg, addressee) => {
    // this if-check is for better user experience (see explanation on 'user-message' above)
    const privateMessage = createPrivateMessage(
      msg,
      currentUser.name,
      addressee,
      currentUser.room,
      true
    );

    const userExists = await findUser(addressee);

    // save message to database if there's addresse in private message and if the addressee exists in database (if there's no addressee, the private message will not be sent)
    if (addressee && userExists) {
      const savedPrivateMessage = await privateMessage.save();
    }

    if (addressee === currentUser.name) {
      return io
        .to(currentUser.chatId)
        .emit("private-message", generateMessage(currentUser.name, msg));
    }

    const sendMessageToThisUser = await findUser(addressee);

    if (!sendMessageToThisUser) {
      io.to(currentUser.chatId).emit(
        "private-message",
        generateMessage(chatBotName, "Unable to send message to this user.")
      );
      return console.log("from server: no user found");
    }
    //     send private message to a person and the same message to yourself
    io.to([sendMessageToThisUser.chatId, currentUser.chatId]).emit(
      "private-message",
      generateMessage(currentUser.name, msg, addressee)
    );
  });

  socket.on("disconnect", async () => {
    const userLeft = await updateUserToOffline(socket.id);

    const usersInSpecificRoom = await getUsersInRoom(userLeft.room);

    socket.broadcast
      .to(currentUser.room)
      .emit(
        "user-left",
        generateMessage(chatBotName, `${currentUser.name} left`),
        usersInSpecificRoom
      );
  });
});

server.listen(port, () => {
  console.log("listening on port :", port);
});
