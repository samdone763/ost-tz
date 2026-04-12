const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Helper: Tengeneza JWT token
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '30d'
});

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  user.password = undefined;
  res.status(statusCode).json({ success: true, token, user });
};

// ─── POST /api/auth/register ───────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Jina linahitajika'),
  body('email').isEmail().withMessage('Email si sahihi'),
  body('phone').matches(/^(\+255|0)[67]\d{8}$/).withMessage('Namba ya simu si sahihi'),
  body('password').isLength({ min: 8 }).withMessage('Neno la siri lazima liwe na herufi 8+'),
  body('role').optional().isIn(['buyer', 'merchant']).withMessage('Role si sahihi')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, email, phone, password, role, region } = req.body;

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: exists.email === email ? 'Email tayari ipo' : 'Namba ya simu tayari ipo'
      });
    }

    const user = await User.create({ name, email, phone, password, role: role || 'buyer', region });
    sendToken(user, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/auth/login ──────────────────────────────
router.post('/login', [
  body('email').isEmail().withMessage('Email si sahihi'),
  body('password').notEmpty().withMessage('Neno la siri linahitajika')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Email au neno la siri si sahihi' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Akaunti yako imezuiwa' });
    }

    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    sendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

// ─── PUT /api/auth/update-profile ─────────────────────
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name, phone, region } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, region },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/auth/change-password ────────────────────
router.put('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Neno la siri la sasa si sahihi' });
    }

    user.password = newPassword;
    await user.save();
    sendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/auth/request-deletion ──────────────────
// Hatua ya 1 ya Danger Zone — omba code ya kufuta
router.post('/request-deletion', protect, async (req, res) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const user = await User.findByIdAndUpdate(req.user._id, {
      deletionCode: code,
      deletionCodeExpires: new Date(Date.now() + 10 * 60 * 1000) // dakika 10
    });

    // Hapa unaweza kutuma SMS au email na code
    // Kwa sasa tunareturn tu (katika production tumia SMS)
    console.log(`🔴 Deletion code kwa ${user.email}: ${code}`);

    res.json({
      success: true,
      message: 'Code imetumwa kwenye simu yako. Inaisha baada ya dakika 10.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/auth/confirm-deletion ──────────────────
// Hatua ya 2 — thibitisha code
router.post('/confirm-deletion', protect, async (req, res) => {
  try {
    const { code, password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (user.deletionCode !== code || user.deletionCodeExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Code si sahihi au imeisha muda' });
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Neno la siri si sahihi' });
    }

    // Hatua ya 3 itakuwa katika frontend — confirm final
    await User.findByIdAndUpdate(req.user._id, {
      deletionConfirmedAt: Date.now(),
      deletionCode: undefined,
      deletionCodeExpires: undefined
    });

    res.json({ success: true, message: 'Imethibitishwa. Akaunti itafutwa baada ya masaa 24.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/auth/push-subscription ─────────────────
router.post('/push-subscription', protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
    res.json({ success: true, message: 'Push notifications zimewezeshwa' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
