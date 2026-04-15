require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ─── Security Middleware ───────────────────────────────
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting — kuzuia spam/attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // dakika 15
  max: 100,
  message: { success: false, message: 'Maombi mengi sana. Jaribu baadaye.' }
});
app.use('/api/', limiter);

// Strict limit kwa auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // saa 1
  max: 10,
  message: { success: false, message: 'Majaribio mengi ya kuingia. Jaribu baada ya saa 1.' }
});

// ─── CORS ──────────────────────────────────────────────
app.use(cors({
  origin: '*', // Badilisha hii kwa domain yako halisi katika production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Body Parser ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Database Connection ───────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas imeunganishwa'))
  .catch(err => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });

// ─── Routes ────────────────────────────────────────────
app.use('/api/auth',         authLimiter, require('./routes/auth'));
app.use('/api/stores',       require('./routes/stores'));
app.use('/api/products',     require('./routes/products'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/analytics',    require('./routes/analytics'));
app.use('/api/payments',     require('./routes/payments'));
app.use('/api/search',       require('./routes/search'));
app.use('/api/notifications',require('./routes/notifications'));
app.use('/api/upload',       require('./routes/upload'));
// Ongeza route mpya ya reviews hapa
app.use('/api/reviews',      require('./routes/reviews'));

// ─── Health Check ──────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Online Stores TZ API v2.0 — Enterprise Edition',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// ─── 404 Handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} haipatikani`
  });
});

// ─── Global Error Handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔴 Error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} tayari ipo katika mfumo` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token batili' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Kuna tatizo la seva. Jaribu tena.'
  });
});

// ─── Start Server ──────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 OST v2 Server inaendesha kwenye port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
});
