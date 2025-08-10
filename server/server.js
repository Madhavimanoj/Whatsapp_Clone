require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

// Allow only your frontend to connect in production
const allowedOrigins = [
  "http://localhost:3000", // Local dev
  "https://YOUR-FRONTEND-VERCEL-URL.vercel.app", // Replace with your deployed frontend URL
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(bodyParser.json());

// Routes
const webhookRoutes = require("./routes/webhook");
app.use("/webhook", webhookRoutes);

// Attach io to app so routes can emit events
app.set("io", io);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("🔌 A user connected:", socket.id);

  socket.on("typing", (wa_id) => {
    socket.broadcast.emit("user_typing", wa_id);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("✅ Chat backend is running");
});
