const cors = require("cors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();
require("./db/conn");
const rateLimit = require("express-rate-limit");

// Route modules
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const friendRoutes = require("./routes/friends");
const chatRoutes = require("./routes/chat");
const postRoutes = require("./routes/posts");
const notificationRoutes = require("./routes/notifications");

// --- CRITICAL ERROR HANDLING ---
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
});

const app = express();
app.set("trust proxy", 1);

console.log("Node version:", process.version);
console.log("Memory limit (MB):", process.env.MEMORY_LIMIT || "Not set");
console.log("Environment PORT:", process.env.PORT);

// --- RATE LIMITERS ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per `window`
  message: "Too many login attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
});

const postLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 post creation/comments per minute
  message: "Too many posts created, please slow down",
});

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms) - Origin: ${req.headers.origin || 'none'}`);
  });
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Heartbeat
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`Heartbeat - RSS: ${(mem.rss / 1024 / 1024).toFixed(2)}MB`);
}, 30000);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = [
  "https://connectify2025.vercel.app",
  "http://localhost:5173"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes("onrender.com")) {
      callback(null, true);
    } else {
      console.warn("🚫 CORS Blocked Origin:", origin);
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  allowEIO3: true
});

// Make io and userSocketMap accessible in routes
const userSocketMap = new Map(); // userId => socketId
app.set("io", io);
app.set("userSocketMap", userSocketMap);

console.log("Socket.io initialized");

// Mount Routes
app.get("/", (req, res) => res.status(200).send("API is running"));

// Apply rate limiters to specific route files
app.use("/", apiLimiter);
// Note: More specific limiters should be applied in the route files directly,
// but for simplicity we'll apply them globally to auth paths here:
app.use("/login", authLimiter);
app.use("/signup", authLimiter);
app.use("/forgot-password", authLimiter);

const storyRoutes = require("./routes/stories");

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", friendRoutes);
app.use("/", chatRoutes);
app.use("/", notificationRoutes);
app.use("/", storyRoutes);
app.use("/insta", postLimiter, postRoutes);

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("❌ GLOBAL ERROR:", err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "from:", socket.handshake.headers.origin);

  socket.on("register", (userId) => {
    userSocketMap.set(userId, socket.id);
    socket.join(`user:${userId}`); // Room for direct targeting
    io.emit("online-users", Array.from(userSocketMap.keys()));
  });

  socket.on("send-message", ({ to, message }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive-message", message);
    }
  });

  socket.on("typing", ({ to, from }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("user-typing", from);
    }
  });

  socket.on("stop-typing", ({ to, from }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("user-stop-typing", from);
    }
  });

  // Read receipts — client emits when conversation is opened
  socket.on("mark-read", ({ to, from }) => {
    const senderSocketId = userSocketMap.get(to);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages-read", { by: from, from: to });
    }
  });

  // Message deleted for everyone
  socket.on("delete-message", ({ to, messageId, deleteFor }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("message-deleted", { messageId, deleteFor });
    }
  });

  // Message reaction update
  socket.on("react-message", ({ to, messageId, reactions }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("message-reaction", { messageId, reactions });
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        io.emit("online-users", Array.from(userSocketMap.keys()));
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 9000;

server.on('error', (e) => {
  console.error("❌ SERVER ERROR event:", e);
});

server.listen(PORT, "0.0.0.0", () => {
  const addr = server.address();
  console.log(`🚀 SERVER IS LIVE!`);
  console.log(`Listening on: ${addr.address}:${addr.port}`);
});
