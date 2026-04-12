const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Store = require('../models/Store');
const Fuse = require('fuse.js');

// GET /api/search?q=&type=products|stores|all&store=&limit=
router.get('/', async (req, res) => {
  try {
    const { q, type = 'all', store: storeId, limit = 20, minPrice, maxPrice } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Andika neno la kutafuta (herufi 2+)' });
    }

    const results = { products: [], stores: [], suggestions: [] };

    // ─── Search Products ───────────────────────────────
    if (type === 'all' || type === 'products') {
      const productQuery = { isActive: true };
      if (storeId) productQuery.store = storeId;
      if (minPrice || maxPrice) {
        productQuery['price.original'] = {};
        if (minPrice) productQuery['price.original'].$gte = Number(minPrice);
        if (maxPrice) productQuery['price.original'].$lte = Number(maxPrice);
      }

      const allProducts = await Product.find(productQuery)
        .populate('store', 'name slug logo location')
        .limit(200);

      // Fuzzy search — inatambua makosa ya herufi
      const fuse = new Fuse(allProducts, {
        keys: ['name', 'description', 'tags', 'category'],
        threshold: 0.4,         // 0 = exact, 1 = match anything
        includeScore: true,
        minMatchCharLength: 2
      });

      const fuseResults = fuse.search(q);
      results.products = fuseResults
        .slice(0, Number(limit))
        .map(r => ({ ...r.item.toObject(), score: r.score }));
    }

    // ─── Search Stores ─────────────────────────────────
    if (type === 'all' || type === 'stores') {
      const allStores = await Store.find({ isActive: true }).limit(100);

      const storeFuse = new Fuse(allStores, {
        keys: ['name', 'description', 'category'],
        threshold: 0.4,
        includeScore: true
      });

      const storeResults = storeFuse.search(q);
      results.stores = storeResults.slice(0, 6).map(r => r.item);
    }

    // ─── Search Suggestions (autocomplete) ────────────
    const suggestions = await Product.find({
      name: { $regex: q, $options: 'i' },
      isActive: true
    }).select('name').limit(8);

    results.suggestions = [...new Set(suggestions.map(p => p.name))];

    res.json({
      success: true,
      query: q,
      results,
      total: results.products.length + results.stores.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/search/autocomplete?q=
router.get('/autocomplete', async (req, res) => {
  try {
    const { q, store } = req.query;
    if (!q || q.length < 1) return res.json({ success: true, suggestions: [] });

    const query = { name: { $regex: q, $options: 'i' }, isActive: true };
    if (store) query.store = store;

    const products = await Product.find(query).select('name category').limit(8);
    const stores = await Store.find({
      name: { $regex: q, $options: 'i' },
      isActive: true
    }).select('name category').limit(4);

    res.json({
      success: true,
      suggestions: [
        ...products.map(p => ({ text: p.name, type: 'product', category: p.category })),
        ...stores.map(s => ({ text: s.name, type: 'store', category: s.category }))
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
