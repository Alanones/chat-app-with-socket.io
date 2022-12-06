const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, "../public")));

// let count = 0;

io.on("connection", (socket) => {
  console.log("New websocket connection");
  // socket.io emits to specific connection (except the sender)

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);
    socket.emit("message", generateMessage((username = "Admin"), "welcome"));
    socket.broadcast
      .to(user.room)
      .emit("message", generateMessage(`${user.username} has joined`));

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
    //   socket.emit, io.emit, socket.broadcast.emit
    // io.to.emit, socket.to.broadcast.emit
  });

  socket.on("sendMessage", (chat, callback) => {
    const user = getUser(socket.id);
    if (user) {
      const filter = new Filter();
      if (filter.isProfane(chat)) {
        return callback("Profanity is not allowed");
      }
      // io.emit emits to all connection
      io.to(user.room).emit("message", generateMessage(user.username, chat));
      callback();
    }
  });

  // When a user disconnects. Use built-in "disconnect" method
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage(user.username, `${user.username} has left`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });

  //   Receive connection event
  socket.on("sendLocation", (loc, callback) => {
    const user = getUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "locationMessage",
        generateLocationMessage(
          user.username,
          `https://google.com/maps?q=${loc.Latitude},${loc.Longitude}`
        )
      );
    }

    callback();
  });
});

server.listen(3000, () => {
  console.log(`Server is up on port ${port}`);
});
