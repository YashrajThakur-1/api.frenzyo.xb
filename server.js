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
const upload = require("./middleware/socketUploadMiddleware");

// Middleware and configurations
app.use(
  cors({
    origin: "*", // Consider replacing "*" with specific domains
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH", "UPDATE"],
  })
);

require("./routes/passport"); // Ensure this path is correct
//multer middlewares

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
      // Simulate req and res objects for Multer
      const req = {
        body: data,
        files: data.files,
        headers: {
          "content-type": "multipart/form-data",
          // Add other necessary headers that Multer might expect
        },
        get: (header) => req.headers[header.toLowerCase()],
      };

      const res = {
        statusCode: 200,
        setHeader: () => {},
        end: () => {},
      };

      // Invoke Multer middleware
      upload(req, res, async (err) => {
        if (err) {
          console.error("Error during file upload:", err);
          socket.emit("error", "File upload failed.");
          return;
        }

        // Handle photos
        const photos = [];
        if (req.files && req.files.photos && req.files.photos.length > 0) {
          req.files.photos.forEach((file) => {
            const photo = {
              fileName: file.originalname,
              fileSize: file.size,
              url: file.filename, // Change this to the actual URL if needed
              timestamp: new Date(),
            };
            photos.push(photo);
          });
        }

        // Handle documents
        const documents = [];
        if (
          req.files &&
          req.files.documents &&
          req.files.documents.length > 0
        ) {
          req.files.documents.forEach((file) => {
            const document = {
              name: file.originalname,
              type: file.mimetype,
              size: file.size,
              uri: file.filename, // Change this to the actual URL if needed
              timestamp: new Date(),
            };
            documents.push(document);
          });
        }

        const newMessage = new Message({
          ...data,
          sender: data.senderId,
          receiver: data.receiverId,
          message: data.text,
          photos: photos,
          documents: documents,
          polls: data.polls,
          contacts: data.contacts,
        });

        await newMessage.save();

        // Emit the message to the specific receiver
        io.to(data.receiverId).emit("receiveMessage", newMessage);
        console.log("Message sent and saved:", newMessage);
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  //Get by Single ID and Delete

  socket.on("deleteMessage", async (messageId) => {
    console.log("deleteMessage event received with messageId:", messageId);

    try {
      // Find and delete the message by its ID
      const deletedMessage = await Message.findByIdAndDelete({
        _id: messageId,
      });

      if (deletedMessage) {
        console.log("Message deleted successfully:", deletedMessage);

        // Notify the sender and receiver about the deletion
        io.to(deletedMessage.sender).emit("messageDeleted", messageId);
        io.to(deletedMessage.receiver).emit("messageDeleted", messageId);
      } else {
        console.log("Message not found or already deleted.");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  });
  socket.on("updatemessage", async (data) => {
    const { messageId } = data;
    console.log("Update Message event received with messageId:", messageId);
    try {
      // Find and update the message by its ID
      const updatedMessage = await Message.findByIdAndUpdate(
        { _id: messageId },
        data.message,
        {
          new: true,
          runValidators: true,
        }
      );

      if (updatedMessage) {
        console.log("Message updated successfully:", updatedMessage);

        // Notify the sender and receiver about the update
        io.to(updatedMessage.sender).emit("messageUpdated", messageId);
        io.to(updatedMessage.receiver).emit("messageUpdated", messageId);
      } else {
        console.log("Message not found or already deleted.");
      }
    } catch (error) {
      console.error("Error updating message:", error);
    }
  });

  // Handle group messages
  socket.on("sendGroupMessage", async (data) => {
    console.log("sendGroupMessage event received with data:", data);

    try {
      // Handle file uploads and save message

      const newMessage = new Message({
        ...data,
        photos: photos,
        documents: documents,
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

// Start the server
const port = process.env.PORT || 3000;

http.listen(port, () => {
  console.log(`Server Running On Port ${port}`);
});

// setTimeout(() => {
//   console.log("Delayed 3 seconds After");
// }, 5000);
// setInterval(() => {
//   console.log("After every 2 seconds");
// }, 3000);
