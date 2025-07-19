const mongoose = require("mongoose");

mongoose.connect(
  `mongodb+srv://Nipun:${process.env.PASSWORD}@connectify.nstwyzk.mongodb.net/connectify?retryWrites=true&w=majority&appName=Connectify`,
  {

  }
)
.then(() => console.log("✅ MongoDB connected via Mongoose"))
.catch((err) => console.error("❌ MongoDB connection error:", err));
