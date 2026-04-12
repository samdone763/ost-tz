const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const { protect, optionalAuth } = require('../middleware/auth');

// ─── POST /api/orders ──────────────────────────────────
// Weka oda mpya (guest au logged in)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { storeId, items, customerInfo, payment, pricing } = req.body;

    // Validate store
    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(404).json({ success: false, message: 'Biashara haipatikani' });
    }

    // Validate na price-check items
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, message: `Bidhaa "${item.name}" haipatikani tena` });
      }

      // Stock check
      if (product.stock.trackStock && product.stock.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name}: Stock imebaki ${product.stock.quantity} tu`
        });
      }

      const itemPrice = product.price.discounted || product.price.original;
      const variantModifier = (item.selectedVariants || []).reduce((sum, v) => sum + (v.priceModifier || 0), 0);
      const finalPrice = itemPrice + variantModifier;
      const subtotal = finalPrice * item.quantity;
      calculatedSubtotal += subtotal;

      validatedItems.push({
        product: product._id,
        name: product.name,
        image: product.media.find(m => m.isPrimary)?.url || product.media[0]?.url,
        price: finalPrice,
        quantity: item.quantity,
        selectedVariants: item.selectedVariants || [],
        subtotal
      });
    }

    // Create order
    const order = await Order.create({
      buyer: req.user?._id,
      store: storeId,
      items: validatedItems,
      customerInfo,
      pricing: {
        ...pricing,
        subtotal: calculatedSubtotal,
        total: calculatedSubtotal + (pricing.deliveryFee || 0) - (pricing.discount || 0)
      },
      payment,
      status: 'pending',
      tracking: [{
        status: 'pending',
        message: 'Oda imepokelewa. Tunasubiri uthibitisho wa muuzaji.',
        location: 'Online Stores TZ System'
      }]
    });

    // Punguza stock
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {
          'stock.quantity': -item.quantity,
          'stats.purchases': item.quantity
        }
      });
    }

    // Update store stats
    await Store.findByIdAndUpdate(storeId, {
      $inc: { 'stats.totalOrders': 1 }
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('store', 'name slug contact')
      .populate('buyer', 'name email');

    res.status(201).json({ success: true, order: populatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/orders/:orderNumber ─────────────────────
// Track oda (public — kwa order number)
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('store', 'name slug logo contact')
      .select('-buyer');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Oda haipatikani. Angalia namba ya oda.' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/orders/my-orders ────────────────────────
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate('store', 'name slug logo')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/orders/store/:storeId ───────────────────
// Oda za biashara (kwa merchant)
router.get('/store/:storeId', protect, async (req, res) => {
  try {
    const store = await Store.findById(req.params.storeId);
    if (!store || store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const query = { store: req.params.storeId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('buyer', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true, orders,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/orders/:id/status ───────────────────────
// Update hali ya oda (merchant)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, message, location } = req.body;
    const order = await Order.findById(req.params.id).populate('store');

    if (!order) return res.status(404).json({ success: false, message: 'Oda haipatikani' });

    if (order.store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    const statusMessages = {
      confirmed: 'Muuzaji amekubali oda yako. Inatayarishwa.',
      processing: 'Bidhaa inafungashwa.',
      shipped: 'Bidhaa imesafirishwa.',
      out_for_delivery: 'Bidhaa iko njiani kwako.',
      delivered: 'Bidhaa imefikishwa. Asante kwa ununuzi!',
      cancelled: 'Oda imefutwa.'
    };

    order.status = status;
    order.tracking.push({
      status,
      message: message || statusMessages[status] || status,
      location: location || 'Online Stores TZ',
      timestamp: new Date()
    });

    if (status === 'delivered') order.deliveredAt = new Date();
    if (status === 'cancelled') order.cancelledAt = new Date();

    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
