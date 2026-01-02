const cors = require("cors");
const express = require("express");
const bcrypt = require("bcryptjs");
const path = require("path");
const auth = require("./middleware/auth");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
require("./db/conn");

const Message = require("./models/Message");
const Post = require("./models/Posts");

const crypto = require("crypto");
const User = require("./models/users");
const FriendRequest = require("./models/FriendRequest");
const sendOtpEmail = require("./nodemailer/mailer");

// --- CRITICAL ERROR HANDLING ---
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
  // Optionally: process.exit(1) if you want to force a restart
});

const app = express();
app.set("trust proxy", 1);

console.log("Node version:", process.version);
console.log("Memory limit (MB):", process.env.MEMORY_LIMIT || "Not set");
console.log("Environment PORT:", process.env.PORT);

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms) - Origin: ${req.headers.origin || 'none'}`);
  });
  next();
});

// HEALTH CHECK - Moved to top for reliability
app.get("/health", (req, res) => {
  console.log("Health check hit");
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Heartbeat to confirm process is alive
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
      callback(null, false); // Better to return false than an error to avoid crashing
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

console.log("Socket.io initialized");


const userSocketMap = new Map(); // userId => socketId


let storedOtp = "";
let otpEmail = "";
app.get("/", (req, res) => {
  res.status(200).send("API is running");
});

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    await new User({ username, email, password: hashedPassword }).save();

    res.status(200).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/verify-token", auth, (req, res) => {
  res.status(200).json({ user: req.user });
});


app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = await user.generatetoken();
      res.cookie("jwt", token, { httpOnly: true, sameSite: "none", secure: true, maxAge: 100 * 365 * 24 * 60 * 60 * 1000 });
      res.status(200).send({ message: "Login successful", _id: user._id });
    } else {
      res.status(400).send("Invalid credentials");
    }
  } catch {
    res.status(500).send("Internal server error");
  }
});

app.post("/forgot-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send("User not found");
    const otp = crypto.randomBytes(3).toString("hex");
    storedOtp = otp;
    otpEmail = req.body.email;
    await sendOtpEmail(otpEmail, otp);
    res.send("OTP sent");
  } catch {
    res.status(400).send("Error sending OTP");
  }
});

app.post("/verify-otp", async (req, res) => {
  const { otp, newPassword } = req.body;
  if (otp !== storedOtp) return res.status(400).send("Invalid OTP");
  try {
    const user = await User.findOne({ email: otpEmail });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    storedOtp = otpEmail = "";
    res.send("Password updated successfully");
  } catch {
    res.status(400).send("Error updating password");
  }
});

app.get("/get-user", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/edituser", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.username = req.body.n;
    user.description = req.body.d;
    await user.save();
    res.send("Edited successfully");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/upload-image", auth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });
    await User.findByIdAndUpdate(req.user._id, { image });
    res.json({ imageUrl: image });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/getUserInfo", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username }).select("username description image");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Unable to fetch user details" });
  }
});


app.post("/sendFriendRequest", auth, async (req, res) => {
  try {
    const senderId = req.user._id;
    const { recipientId } = req.body;
    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!sender || !recipient) {
      return res.status(404).json({ message: "Sender or recipient not found." });
    }

    // Existing pending request?
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId },
      ],
      status: { $in: ["pending", "accepted"] }
    });

    if (existingRequest) {
      const message = existingRequest.status === "accepted"
        ? "You are already friends."
        : "Friend request already pending.";

      return res.status(400).json({ message });
    }


    //  Create new request
    const newRequest = new FriendRequest({
      sender: senderId,
      recipient: recipientId,
    });

    await newRequest.save();

    res.status(201).json({ message: "Friend request sent successfully.", request: newRequest });
  } catch (err) {
    console.error("Error sending friend request:", err);
    res.status(500).json({ message: "Server error." });
  }
});


app.get("/friendRequests", auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      recipient: req.user._id,
      status: "pending"
    }).populate("sender", "username");
    res.json(requests);
  } catch {
    res.status(500).json({ error: "Error fetching friend requests" });
  }
});

app.post("/friend-requests/respond", auth, async (req, res) => {
  const { requestId, action } = req.body;

  try {
    const request = await FriendRequest.findById(requestId);


    request.status = action === "accept" ? "accepted" : "rejected";
    await request.save();

    res.json({ message: `Friend request ${action}ed successfully.` });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/friends", auth, async (req, res) => {
  try {
    const friends = await FriendRequest.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
      status: "accepted"
    }).populate("sender recipient", "username");
    res.json(friends);
  } catch {
    res.status(500).json({ error: "Error fetching friends" });
  }
});

app.post("/friends/remove", auth, async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await FriendRequest.findById(requestId);

    await FriendRequest.findByIdAndDelete(requestId);
    res.json({ message: "Unfriended successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }

})

app.post("/search", auth, async (req, res) => {
  try {
    const users = await User.find({
      username: { $regex: req.body.search, $options: "i" },
      _id: { $ne: req.user._id }
    }).select("username description image");
    res.json(users);
  } catch {
    res.status(500).json({ error: "Unable to search users" });
  }
});

app.post("/getchatlist", auth, async (req, res) => {
  const searchQuery = req.body.search || "";

  try {
    // Step 1: Get all accepted requests involving the current user
    const acceptedFriends = await FriendRequest.find({
      status: "accepted",
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ]
    });


    // Step 2: Extract friend IDs properly
    const friendIds = acceptedFriends.map(fr => {
      const senderId = fr.sender.toString();
      const recipientId = fr.recipient.toString();
      const currentUserId = req.user._id.toString();

      return senderId === currentUserId ? fr.recipient : fr.sender;
    });



    // Step 3: Fetch friends from user collection with search filter
    const users = await User.find({
      _id: { $in: friendIds },
      username: { $regex: searchQuery, $options: "i" }
    }).select("username description image");

    console.log("Users Found:", users);

    res.json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Unable to search friends" });
  }
});

app.post("/send-message", auth, async (req, res) => {
  try {
    const { recipientId, content, image } = req.body;
    const newMessage = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      content,
      image,
    });
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});


// Express example
app.post("/re-auth", async (req, res) => {
  const { userId } = req.body;

  // Ideally, verify userId with DB
  const user = await User.findById(userId);

  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid user" });
  }

  // Optionally reissue session/token here
  return res.json({ success: true, user });
});


app.get("/user/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json("User not found");
  res.json(user);
});

app.post("/logout", auth, async (req, res) => {
  req.user.tokens = req.user.tokens.filter(t => t !== req.token);
  await req.user.save();
  res.clearCookie("jwt");
  res.send("Logged out from current tab");
});

app.post("/logout-all", auth, async (req, res) => {
  req.user.tokens = []; // remove all
  await req.user.save();
  res.clearCookie("jwt");
  res.send("Logged out from all devices");
});


// Fetch conversation with a specific friend
app.get("/messages/:friendId", auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: req.params.friendId },
        { sender: req.params.friendId, recipient: req.user._id },
      ],
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});




// ✅ Create Post
app.post("/insta/post", auth, async (req, res) => {
  const { caption, image } = req.body;
  console.log(image, caption);
  try {
    const post = new Post({ user: req.user._id, caption, image });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: "Could not create post" });
  }
});


app.get("/insta/posts", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    const posts = await Post.find({ user: { $ne: req.user._id } }) // Exclude user's own posts
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username image")
      .populate("comments.user", "username image");

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch posts" });
  }
});


// 📁 Get My Posts
app.get("/insta/myposts", auth, async (req, res) => {
  try {

    const posts = await Post.find({ user: req.user._id }).populate("user", "username image").populate("comments.user", "username image").sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch your posts" });
  }
});

// ✏️ Edit Post
app.put("/insta/post/:id", auth, async (req, res) => {
  const { caption, image } = req.body;

  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: "Post not found" });

    post.caption = caption || post.caption;
    post.image = image || post.image;
    console.log(post.caption, post.image);
    const updatedPost = await post.save();

    res.json(updatedPost);
  } catch (err) {
    res.status(500).json({ error: "Could not update post" });
  }
});

// ❌ Delete Post
app.delete("/insta/post/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    console.log("gg");

    await post.deleteOne(); // or Post.findByIdAndDelete(post._id)
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Could not delete post" });
  }
});


// 👍 Like/Unlike Post
app.post("/insta/post/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const index = post.likes.indexOf(req.user._id);
    if (index === -1) {
      post.likes.push(req.user._id);
    } else {
      post.likes.splice(index, 1); // unlike
    }
    await post.save();
    res.json({ likes: post.likes.length });
  } catch (err) {
    res.status(500).json({ error: "Error liking post" });
  }
});


//add comment
// add comment
app.post("/insta/post/:id/comment", auth, async (req, res) => {
  const { text } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ error: "Comment cannot be empty" });
  }

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const newComment = {
      user: req.user._id,
      text: text.trim(),
    };

    post.comments.push(newComment);
    await post.save();

    // ✅ FIX: populate and assign
    const populatedPost = await Post.findById(post._id).populate("comments.user", "username");

    res.status(201).json({ message: "Comment added", comments: populatedPost.comments });
  } catch (err) {
    res.status(500).json({ error: "Could not add comment" });
  }
});

//get comments
app.get("/insta/post/:id/comments", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("comments.user", "username");

    if (!post) return res.status(404).json({ error: "Post not found" });
    console.log("Post Comments Populated:", post.comments);

    res.json(post.comments); // Only return comments
  } catch (err) {
    res.status(500).json({ error: "Could not fetch comments" });
  }
});


// Inside io.on("connection") in your existing backend

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "from:", socket.handshake.headers.origin);

  socket.on("register", (userId) => {
    userSocketMap.set(userId, socket.id);
  });

  socket.on("send-message", ({ to, message }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive-message", message);
    }
  });


  socket.on("disconnect", () => {
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  });
});


const PORT = process.env.PORT || 9000;

server.on('error', (e) => {
  console.error("❌ SERVER ERROR event:", e);
});

console.log(`Attempting to start server on port ${PORT}...`);

server.listen(PORT, "0.0.0.0", () => {
  const addr = server.address();
  console.log(`🚀 SERVER IS LIVE!`);
  console.log(`Listening on: ${addr.address}:${addr.port}`);
  console.log(`Working directory: ${process.cwd()}`);
});
