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
  console.log("connected to socket.io");
  //creating a room for user
  socket.on('setup', (userData) => {
    socket.join(userData.user._id);
    // console.log("logged user",userData)
    socket.emit('connected');
  })

  socket.on('join chat', (room) => {
    socket.join(room);
    // console.log("user joined room"+room);
  })

  socket.on('new message', (newMessageRecieved) => {

    var chat = newMessageRecieved.chat;
    if (!chat.chatUsers) return console.log("chat.user is not define");
    chat.chatUsers.forEach(user => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit('chatMessageRecieved', newMessageRecieved);
    });
  })

  socket.off("setup", () => {
    console.log("User disconnected");
    socket.leave(userData._id)
  })
})