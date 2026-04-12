const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// ─── GET /api/stores ───────────────────────────────────
// Pata biashara zote (na filters)
router.get('/', async (req, res) => {
  try {
    const { category, region, search, page = 1, limit = 12, featured } = req.query;
    const query = { isActive: true };

    if (category) query.category = category;
    if (region) query['location.region'] = region;
    if (featured === 'true') query.isFeatured = true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('owner', 'name email phone')
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Store.countDocuments(query)
    ]);

    res.json({
      success: true,
      stores,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/stores/:slug ─────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const store = await Store.findOne({
      $or: [{ slug: req.params.slug }, { _id: req.params.slug.match(/^[0-9a-fA-F]{24}$/) ? req.params.slug : null }],
      isActive: true
    }).populate('owner', 'name email phone');

    if (!store) {
      return res.status(404).json({ success: false, message: 'Biashara haipatikani' });
    }

    res.json({ success: true, store });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/stores ──────────────────────────────────
router.post('/', protect, authorize('merchant', 'admin'), async (req, res) => {
  try {
    const existing = await Store.findOne({ owner: req.user._id });
    if (existing && req.user.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Una biashara moja tayari' });
    }

    const store = await Store.create({ ...req.body, owner: req.user._id });
    res.status(201).json({ success: true, store });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/stores/:id ───────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Biashara haipatikani' });

    if (store.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Huna ruhusa ya kuhariri biashara hii' });
    }

    const updated = await Store.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });

    res.json({ success: true, store: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/stores/owner/my-store ───────────────────
router.get('/owner/my-store', protect, async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) return res.status(404).json({ success: false, message: 'Bado una biashara' });
    res.json({ success: true, store });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /api/stores/:id ────────────────────────────
// Inahitaji confirmation token (multi-step)
router.delete('/:id', protect, async (req, res) => {
  try {
    const { confirmationToken } = req.body;
    const store = await Store.findById(req.params.id);

    if (!store) return res.status(404).json({ success: false, message: 'Biashara haipatikani' });
    if (store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    // Thibitisha token (kutoka hatua ya kwanza)
    if (!confirmationToken || confirmationToken !== `DELETE-${store._id}-${req.user._id}`) {
      return res.status(400).json({ success: false, message: 'Thibiti ufutaji kwanza' });
    }

    // Soft delete — weka isActive: false badala ya kufuta kabisa
    await Store.findByIdAndUpdate(req.params.id, { isActive: false });
    await Product.updateMany({ store: req.params.id }, { isActive: false });

    res.json({ success: true, message: 'Biashara imefutwa' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/stores/:id/deletion-token ───────────────
// Hatua ya 1 ya kufuta — pata token
router.get('/:id/deletion-token', protect, async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store || store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    const token = `DELETE-${store._id}-${req.user._id}`;
    res.json({ success: true, token, message: 'Tumia token hii kufuta biashara. Inathibitisha utambulisho wako.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
