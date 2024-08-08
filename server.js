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
const upload = require("./middleware/multer");

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
  console.log("New client connected. Socket ID:", socket.id);

  socket.on("sendMessage", async (data) => {
    console.log("sendMessage event received with data:", data);

    try {
      const uploadedFiles = await handleFileUpload(data.files);
      console.log("Files uploaded successfully:", uploadedFiles);

      const newMessage = new Message({
        ...data,
        sender: data.senderId,
        receiver: data.receiverId,
        photos: uploadedFiles.photos,
        documents: uploadedFiles.documents,
        polls: data.polls,
        contacts: data.contacts,
      });
      await newMessage.save();

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
    console.log("sendGroupMessage event received with data:", data);

    try {
      const uploadedFiles = await handleFileUpload(data.files);
      console.log("Files uploaded successfully:", uploadedFiles);

      const newMessage = new Message({
        ...data,
        photos: uploadedFiles.photos,
        documents: uploadedFiles.documents,
        polls: data.polls,
        contacts: data.contacts,
      });
      await newMessage.save();
      console.log("Group message saved:", newMessage);

      const group = await Group.findById(data.room);
      if (!group) {
        console.error("Group not found:", data.room);
        return;
      }
      group.messages.push(newMessage);
      await group.save();
      console.log("Group updated with new message.");

      io.to(data.room).emit("receiveGroupMessage", newMessage);
      console.log("Group message sent to room:", data.room);
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected. Socket ID:", socket.id);
  });
});

// Function to handle file uploads
const handleFileUpload = async (files) => {
  let photos = [];
  let documents = [];

  console.log("Handling file upload. Files:", files);

  try {
    if (files) {
      const uploadedPhotos = files.filter((file) =>
        file.mimetype.startsWith("image/")
      );
      const uploadedDocuments = files.filter(
        (file) => !file.mimetype.startsWith("image/")
      );

      photos = uploadedPhotos.map((file) => file.filename);
      documents = uploadedDocuments.map((file) => file.filename);

      console.log("Photos uploaded:", photos);
      console.log("Documents uploaded:", documents);
    }
  } catch (error) {
    console.error("Error handling file upload:", error);
  }

  return { photos, documents };
};

// Start the server
const port = process.env.PORT || 3000;

http.listen(port, () => {
  console.log(`Server Running On Port ${port}`);
});
