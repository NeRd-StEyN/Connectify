const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/users");
const Otp = require("../models/Otp");
const auth = require("../middleware/auth");
const sendOtpEmail = require("../nodemailer/mailer");

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Password validation
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

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

// Verify Token
router.get("/verify-token", auth, (req, res) => {
  res.status(200).json({ user: req.user });
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = await user.generatetoken();
      res.cookie("jwt", token, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (was 100 years!)
      });
      res.status(200).send({ message: "Login successful", _id: user._id });
    } else {
      res.status(400).send("Invalid credentials");
    }
  } catch {
    res.status(500).send("Internal server error");
  }
});

// Forgot Password — OTP stored per-user in DB with 10min expiry
router.post("/forgot-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send("User not found");

    const otp = crypto.randomBytes(3).toString("hex");

    // Delete any existing OTP for this email, then create new one
    await Otp.deleteMany({ email: req.body.email });
    await new Otp({ email: req.body.email, otp }).save();

    await sendOtpEmail(req.body.email, otp);
    res.send("OTP sent");
  } catch {
    res.status(400).send("Error sending OTP");
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).send("Password must be at least 6 characters");
  }

  try {
    const storedOtp = await Otp.findOne({ email, otp });
    if (!storedOtp) return res.status(400).send("Invalid or expired OTP");

    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("User not found");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Clean up used OTP
    await Otp.deleteMany({ email });

    res.send("Password updated successfully");
  } catch {
    res.status(400).send("Error updating password");
  }
});

// Logout (current session)
router.post("/logout", auth, async (req, res) => {
  req.user.tokens = req.user.tokens.filter(t => t !== req.token);
  await req.user.save();
  res.clearCookie("jwt");
  res.send("Logged out from current tab");
});

// Logout (all devices)
router.post("/logout-all", auth, async (req, res) => {
  req.user.tokens = [];
  await req.user.save();
  res.clearCookie("jwt");
  res.send("Logged out from all devices");
});

module.exports = router;
