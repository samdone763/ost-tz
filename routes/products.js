const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Store = require('../models/Store');
const { protect } = require('../middleware/auth');

// ─── GET /api/products ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { store, category, minPrice, maxPrice, page = 1, limit = 20, sort = '-createdAt', featured } = req.query;
    const query = { isActive: true };

    if (store) query.store = store;
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (minPrice || maxPrice) {
      query['price.original'] = {};
      if (minPrice) query['price.original'].$gte = Number(minPrice);
      if (maxPrice) query['price.original'].$lte = Number(maxPrice);
    }

    const sortOptions = {
      '-createdAt': { createdAt: -1 },
      'price-asc': { 'price.original': 1 },
      'price-desc': { 'price.original': -1 },
      'popular': { 'stats.purchases': -1 },
      'rating': { 'stats.rating': -1 }
    };

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('store', 'name slug logo location')
        .sort(sortOptions[sort] || { createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true, products,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/products/:id ─────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('store', 'name slug logo contact location paymentMethods delivery');

    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Bidhaa haipatikani' });
    }

    // Ongeza view count
    await Product.findByIdAndUpdate(req.params.id, { $inc: { 'stats.views': 1 } });

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/products ────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) return res.status(404).json({ success: false, message: 'Biashara haipatikani. Unda kwanza.' });

    const product = await Product.create({ ...req.body, store: store._id });

    // Update store stats
    await Store.findByIdAndUpdate(store._id, { $inc: { 'stats.totalProducts': 1 } });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/products/:id ─────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('store');
    if (!product) return res.status(404).json({ success: false, message: 'Bidhaa haipatikani' });

    if (product.store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /api/products/:id ──────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('store');
    if (!product) return res.status(404).json({ success: false, message: 'Bidhaa haipatikani' });

    if (product.store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    await Store.findByIdAndUpdate(product.store._id, { $inc: { 'stats.totalProducts': -1 } });

    res.json({ success: true, message: 'Bidhaa imefutwa' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/products/recommended/:storeId ────────────
// AI Recommendations — bidhaa zinazofanana
router.get('/recommended/:storeId', async (req, res) => {
  try {
    const { budget, category, limit = 6 } = req.query;
    const query = { store: req.params.storeId, isActive: true };

    if (category) query.category = category;
    if (budget) query['price.original'] = { $lte: Number(budget) };

    const products = await Product.find(query)
      .sort({ 'stats.purchases': -1, 'stats.rating': -1 })
      .limit(Number(limit));

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
