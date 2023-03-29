const socket = io();

const usersListContainer = document.getElementById("users-container");
const messageForm = document.getElementById("send-message-form");
const messageInputField = document.getElementById("message-input");
const publicMessagesContainer = document.getElementById(
  "public-messages-container"
);
const privateMessagesContainer = document.getElementById(
  "private-messages-container"
);

const roomsBtns = document.querySelectorAll("li.room > input");

const messageToInput = document.getElementById("addressee-input");
const publicMessages = document.getElementById("public-messages");
const privateMessages = document.getElementById("private-messages");
const hideShowPublicMessagesBtn = document.getElementById(
  "hide-show-public-messages-btn"
);
const userIsTypingContainer = document.getElementById("typing-status");
const sendPrivateMessageBtn = document.getElementById(
  "send-private-message-btn"
);

const chevronUp = document.getElementById("chevron-up");
const chevronDown = document.getElementById("chevron-down");
const clearPrivateWindowBtn = document.getElementById("clear-private-window");

const toggleHideChevron = () => {
  chevronUp.classList.toggle("hide-chevron");
  chevronDown.classList.toggle("hide-chevron");
};

const showHidePublicMessagesWindow = () => {
  publicMessagesContainer.classList.toggle("hide-public-messages-container");
};

const scrollToBottomAutomatically = (elem) => {
  elem.scrollTop = elem.scrollHeight;
};

hideShowPublicMessagesBtn.addEventListener("click", () => {
  toggleHideChevron();
  showHidePublicMessagesWindow();
});

clearPrivateWindowBtn.addEventListener("click", () => {
  // remove all elements (<li> items) inside private messages <ul></ul>
  privateMessages.replaceChildren();
});

// user goes to another room
roomsBtns.forEach((roomBtn) => {
  roomBtn.addEventListener("click", () => {
    const roomName = roomBtn.value;
    socket.emit("room-name", roomName);
  });
});

sendPrivateMessageBtn.addEventListener("click", () => {
  const userMessage = messageInputField.value;
  const addressee = messageToInput.value;
  if (userMessage) {
    // send message to server
    socket.emit("private-message", userMessage, addressee, socket.id);

    messageInputField.value = "";
    messageToInput.value = "";
  }
});

//  ===== user is typing here (user-is-typing.js) =====

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const userMessage = messageInputField.value;
  const addressee = messageToInput.value;

  if (userMessage) {
    // send message to server
    socket.emit("user-message", userMessage, addressee);
    messageInputField.value = "";
  }
  messageToInput.value = "";
});

const addNameToAddressField = (messageTo) => {
  messageToInput.value = messageTo;
};

const makeAddresseeBtn = (addressee) => {
  // we need the argument function('${addressee}') to be of type string, Otherwise, we'll get a 'refference error'

  if (!addressee) {
    return `<span></span>`;
  }
  return `<button onclick="addNameToAddressField('${addressee}')" class='addressee-btn' id="addressee-btn" >${addressee}</button>`;
};

const clearPublicMessages = () => {
  publicMessages.replaceChildren();
};

const publishMessage = (message, messageType) => {
  const messageContainer = document.createElement("li");
  messageContainer.classList.add("message");
  const addresseeBtn = makeAddresseeBtn(message.author);
  const addresseeBtnOnJoiningChat = makeAddresseeBtn(message.addressee);

  message.author === "chat bot"
    ? (messageContainer.innerHTML = `
        <div class="message-details">
            <span class="message-author">
              ${message.author}
            </span>
            <span class="message-sent-time">${message.createdAt}</span>
        </div> 
        <div class="message-text">
          <span class="message-author">        
          ${addresseeBtnOnJoiningChat}      
          </span> 
          ${message.message}
        </div>`)
    : (messageContainer.innerHTML = `
        <div class="message-details">
          <span class="message-author">        
            ${addresseeBtn}      
          </span>        
          <span class="message-sent-time">${message.createdAt}</span>
        </div> 
        <div class="message-text">
          <span class="message-sent-to">        
            ${message.addressee}      
          </span>
        ${message.message}
        </div>`);

  messageType.appendChild(messageContainer);
};

const clearUsersList = () => {
  usersListContainer.replaceChildren();
};

const addUserToUsersList = (users) => {
  users.forEach((user) => {
    const userContainer = document.createElement("li");
    userContainer.classList.add("user");
    const addresseeBtn = makeAddresseeBtn(user.name);
    userContainer.innerHTML = `${addresseeBtn}`;
    usersListContainer.appendChild(userContainer);
  });
};

socket.on("previos-messages", (messages) => {
  // clear user's public window from the messages of the room which they left
  clearPublicMessages();
  // we get the last two (five, ten etc) elements from the database,
  // the last-created element becomes the first in the array and
  // it will be published first, but we need it to be published last. so that it's
  // in the bottom of the page
  // so we need to reverse() elements first
  messages.reverse().forEach((message) => {
    publishMessage(message, publicMessages);
  });
});

socket.on("user-joined-chat", (msg, users) => {
  publishMessage(msg, publicMessages);
  // remove users from users container before adding (appending) new user
  clearUsersList();
  addUserToUsersList(users);
  scrollToBottomAutomatically(publicMessagesContainer);
});

socket.on("user-left", (msg, users) => {
  publishMessage(msg, publicMessages);
  scrollToBottomAutomatically(publicMessagesContainer);
  clearUsersList();
  addUserToUsersList(users);
});

socket.on("user-message", (msg) => {
  publishMessage(msg, publicMessages);
  scrollToBottomAutomatically(publicMessagesContainer);
});

socket.on("private-message", (msg) => {
  publishMessage(msg, privateMessages);
  scrollToBottomAutomatically(privateMessagesContainer);
});

// user goes to another room
socket.on("join-another-room", (msg, users) => {
  publishMessage(msg, publicMessages);
  scrollToBottomAutomatically(publicMessagesContainer);
  clearUsersList();
  addUserToUsersList(users);
});
