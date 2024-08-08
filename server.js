require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http").Server(app);
const socketIo = require("socket.io");
const path = require("path");
const passport = require("passport");

const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");

const db = require("./database/db");
const userRoutes = require("./routes/UserRoutes");
const messageRoutes = require("./routes/Messages");
// const groupRoutes = require("./routes/Groups"); // Import group routes
const Message = require("./model/MessageSchema");
const Group = require("./model/GroupSchema");
const wallpaperRoutes = require("./routes/Wallpaper");
const storyRoutes = require("./routes/Story");

// Middleware and configurations
app.use(
  cors({
    origin: "*", // Consider replacing "*" with specific domains
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
  })
);

require("./routes/passport"); // Ensure this path is correct

// Express session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "uploads")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/story", storyRoutes);
app.use("/api/wallpaper", wallpaperRoutes);

// Configure Socket.io with CORS
const io = socketIo(http, {
  cors: {
    origin: "*", // You can specify your client's domain here
    methods: ["GET", "POST", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  socket.on("sendMessage", async (data) => {
    try {
      console.log("sendMessage event received with data:", data);
      const newMessage = new Message({
        ...data,
        sender: data.senderId,
        receiver: data.receiverId,
      });
      await newMessage.save();
      console.log("newMessages ::::::", newMessage);
      io.to(data.receiverId).emit("receiveMessage", newMessage);
      console.log("Message sent and saved:", newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  socket.on("joinRoom", (room) => {
    console.log(`joinRoom event received. Room: ${room}`);
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on("sendGroupMessage", async (data) => {
    try {
      console.log("sendGroupMessage event received with data:", data);
      const newMessage = new Message(data);
      await newMessage.save();

      const group = await Group.findById(data.room);
      if (!group) {
        console.error("Group not found:", data.room);
        return;
      }
      group.messages.push(newMessage);
      await group.save();

      io.to(data.room).emit("receiveGroupMessage", newMessage);
      console.log("Group message sent and saved:", newMessage);
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  });
});

// Start the server
const port = process.env.PORT;

http.listen(port, () => {
  console.log(`Server Running On Port ${port}`);
});
