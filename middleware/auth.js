const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Hakikisha user ameingia
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Tafadhali ingia kwanza ili kuendelea'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Mtumiaji hayupo tena'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akaunti yako imezuiwa. Wasiliana na msaada'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token si sahihi. Tafadhali ingia tena'
    });
  }
};

// Ruhusu roles maalum tu
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Huna ruhusa ya kufanya hili. Inahitaji: ${roles.join(', ')}`
      });
    }
    next();
  };
};

// Optional auth — haizuii kama hakuna token
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch (e) {}
  next();
};
