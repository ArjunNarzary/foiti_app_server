const { connectDatabase } = require("./config/database");
const app = require("./app");
const { Server } = require("socket.io");

connectDatabase();

const server = app.listen(process.env.PORT, () => {
  console.log(`Server is runing on port ${process.env.PORT}`);
});



const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    // origin: 'http://localhost:3000'
    origin: '*'
  }
})
io.on('connection', (socket) => {
  socket.on('setup', (userData) => {
    socket.join(userData.user._id);
    socket.emit('connected');
  })

  socket.on('join chat', (room) => {
    socket.join(room);
  })

  socket.on('new message', (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;
    if (!chat.chatUsers) return console.log("chat.user is not define");
    chat.chatUsers.forEach(user => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit('chatMessageRecieved', newMessageRecieved);
    });
  })

  socket.on('new meetup message', (newMessageRecieved) => {

    var chat = newMessageRecieved.chat;
    if (!chat.chatUsers) return console.log("chat.user is not define");
    chat.chatUsers.forEach(user => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit('chatMeetupMessageRecieved', newMessageRecieved);
    });
  })

  socket.off("setup", () => {
    socket.leave(userData._id)
  })
})