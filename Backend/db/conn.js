const mongoose = require("mongoose");

const dbURI = process.env.MONGODB_URI || `mongodb+srv://Nipun:${process.env.PASSWORD}@connectify.nstwyzk.mongodb.net/connectify?retryWrites=true&w=majority&appName=Connectify`;

mongoose.connect(dbURI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

