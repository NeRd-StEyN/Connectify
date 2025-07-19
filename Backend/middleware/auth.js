const jwt = require('jsonwebtoken');
const User = require('../models/users');

const auth = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.redirect('/');
    }
    
    const decoded = jwt.verify(token, process.env.secret_key);
    const user = await User.findOne({ _id: decoded._id, 'tokens.token': token });

    if (!user) {
      return res.redirect('/');
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.redirect('/');
  }
};

module.exports = auth;
