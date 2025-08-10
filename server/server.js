require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

// Full URLs with protocol in allowed origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://statuesque-starlight-9f4193.netlify.app"
];

// CORS options with origin check function
const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin like Postman or curl
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy: The origin ${origin} is not allowed.`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests
app.options('*', cors(corsOptions));

app.use(bodyParser.json());

// Socket.IO with same CORS settings
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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

// Socket.IO events
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("typing", (wa_id) => {
    socket.broadcast.emit("user_typing", wa_id);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("✅ Chat backend is running");
});
