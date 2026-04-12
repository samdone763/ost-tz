const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  uploadProductImages,
  uploadProductVideo,
  uploadStoreLogo,
  uploadStoreBanner,
  uploadAvatar,
  deleteFile
} = require('../middleware/upload');

// ─── POST /api/upload/product-images ──────────────────
router.post('/product-images', protect, (req, res) => {
  uploadProductImages(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Hakuna picha zilizopakiwa' });
    }
    const images = req.files.map(file => ({
      url: file.path,
      publicId: file.filename
    }));
    res.json({ success: true, images });
  });
});

// ─── POST /api/upload/product-video ───────────────────
router.post('/product-video', protect, (req, res) => {
  uploadProductVideo(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'Hakuna video iliyopakiwa' });
    res.json({
      success: true,
      video: { url: req.file.path, publicId: req.file.filename }
    });
  });
});

// ─── POST /api/upload/store-logo ──────────────────────
router.post('/store-logo', protect, (req, res) => {
  uploadStoreLogo(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'Hakuna picha' });
    res.json({ success: true, logo: { url: req.file.path, publicId: req.file.filename } });
  });
});

// ─── POST /api/upload/store-banner ────────────────────
router.post('/store-banner', protect, (req, res) => {
  uploadStoreBanner(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'Hakuna picha' });
    res.json({ success: true, banner: { url: req.file.path, publicId: req.file.filename } });
  });
});

// ─── POST /api/upload/avatar ──────────────────────────
router.post('/avatar', protect, (req, res) => {
  uploadAvatar(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'Hakuna picha' });
    res.json({ success: true, avatar: { url: req.file.path, publicId: req.file.filename } });
  });
});

// ─── DELETE /api/upload/:publicId ─────────────────────
router.delete('/:publicId', protect, async (req, res) => {
  try {
    const { type = 'image' } = req.query;
    await deleteFile(req.params.publicId, type);
    res.json({ success: true, message: 'Picha imefutwa' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
