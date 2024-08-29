require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http").Server(app);
const socketIo = require("socket.io");
const path = require("path");
const passport = require("passport");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./database/db");
const userRoutes = require("./routes/UserRoutes");
const messageRoutes = require("./routes/Messages");
// const groupRoutes = require("./routes/Groups"); // Import group routes
const ejs = require("ejs");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const Message = require("./model/MessageSchema");
const Group = require("./model/GroupSchema");
const wallpaperRoutes = require("./routes/Wallpaper");
const storyRoutes = require("./routes/Story");
const contactRoutes = require("./routes/contactroutes");
const multer = require("multer");
// Middleware and configurations
app.use(
  cors({
    origin: "*", // Consider replacing "*" with specific domains
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH", "UPDATE"],
  })
);

require("./routes/passport"); // Ensure this path is correct
//multer middlewares
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage }).array("files");

// Passport middleware
app.use(passport.initialize());
app.use(express.static(path.join(__dirname, "uploads")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/story", storyRoutes);
app.use("/api/wallpaper", wallpaperRoutes);
app.use("/api/contact", contactRoutes);

// Configure Socket.io with CORS
const io = socketIo(http, {
  cors: {
    origin: "*", // You can specify your client's domain here
    methods: ["GET", "POST", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});
app.get("/", (req, res) => {
  res.render("chat"); // This will render views/chat.ejs
});
// Socket.io connection
io.on("connection", (socket) => {
  console.log("New client connected. Socket ID:", socket.id);

  // Handle direct messages
  socket.on("sendMessage", async (data) => {
    console.log("sendMessage event received with data:", data);

    try {
      // Handle file uploads and save message
      const uploadedFiles = await handleFileUpload(data.files);
      console.log("Files uploaded successfully:", uploadedFiles);

      const newMessage = new Message({
        ...data,
        sender: data.senderId,
        receiver: data.receiverId,
        message: data.text,
        photos: uploadedFiles.photos,
        documents: uploadedFiles.documents,
        audio: uploadedFiles.audio,
        video: uploadedFiles.video,
        polls: data.polls,
        contacts: data.contacts,
      });

      await newMessage.save();

      // Emit the message to the specific receiver
      io.to(data.receiverId).emit("receiveMessage", newMessage);
      console.log("Message sent and saved:", newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  // Handle group messages
  socket.on("sendGroupMessage", async (data) => {
    console.log("sendGroupMessage event received with data:", data);

    try {
      // Handle file uploads and save message
      const uploadedFiles = await handleFileUpload(data.files);
      console.log("Files uploaded successfully:", uploadedFiles);

      const newMessage = new Message({
        ...data,
        photos: uploadedFiles.photos,
        documents: uploadedFiles.documents,
        audio: uploadedFiles.audio, // Handling audio files
        video: uploadedFiles.video, // Handling video files
        polls: data.polls,
        contacts: data.contacts,
      });

      await newMessage.save();
      console.log("Group message saved:", newMessage);

      // Find the group and update it with the new message
      const group = await Group.findById(data.room);
      if (!group) {
        console.error("Group not found:", data.room);
        return;
      }

      group.messages.push(newMessage);
      await group.save();
      console.log("Group updated with new message.");

      // Emit the message to all clients in the room
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
  let audio = [];
  let video = [];

  console.log("Handling file upload. Files:", files);

  try {
    if (files) {
      const uploadedPhotos = files.filter((file) =>
        file.mimetype.startsWith("image/")
      );
      const uploadedDocuments = files.filter(
        (file) =>
          file.mimetype === "application/pdf" ||
          file.mimetype.startsWith("application/")
      );
      const uploadedAudio = files.filter((file) =>
        file.mimetype.startsWith("audio/")
      );
      const uploadedVideo = files.filter((file) =>
        file.mimetype.startsWith("video/")
      );

      photos = uploadedPhotos.map((file) => file.filename);
      documents = uploadedDocuments.map((file) => file.filename);
      audio = uploadedAudio.map((file) => file.filename);
      video = uploadedVideo.map((file) => file.filename);

      console.log("Photos uploaded:", photos);
      console.log("Documents uploaded:", documents);
      console.log("Audio files uploaded:", audio);
      console.log("Video files uploaded:", video);
    }
  } catch (error) {
    console.error("Error handling file upload:", error);
  }

  return { photos, documents, audio, video };
};

// Start the server
const port = process.env.PORT || 3000;

http.listen(port, () => {
  console.log(`Server Running On Port ${port}`);
});
