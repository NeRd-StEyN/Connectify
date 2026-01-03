// models/User.js
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  description: { type: String },
  image: {
    type: String,
    default: function () {
      return `${process.env.URL || ''}/default-photo.png`;
    }
  },

  tokens: [{
    token: {
      type: String,
      required: true,
    }
  }]
});

userSchema.methods.generatetoken = async function () {
  try {
    if (!process.env.secret_key) {
      throw new Error("SECRET_KEY not defined in .env file");
    }
    const token = jwt.sign({ _id: this._id.toString() }, process.env.secret_key, { expiresIn: "7d" });


    this.tokens = this.tokens.concat({ token });


    await this.save();

    return token;
  } catch (err) {
    console.error("Error generating token:", err.message);
    throw err;
  }
};


const User = mongoose.model('User', userSchema);

module.exports = User;
