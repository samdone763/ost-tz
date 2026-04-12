// ═══════════════════════════════════════════════════════
// routes/analytics.js
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const { protect } = require('../middleware/auth');

// GET /api/analytics/:storeId/overview
router.get('/:storeId/overview', protect, async (req, res) => {
  try {
    const store = await Store.findById(req.params.storeId);
    if (!store || store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [orders, topProducts, recentOrders] = await Promise.all([
      Order.find({ store: req.params.storeId, createdAt: { $gte: startDate } }),
      Product.find({ store: req.params.storeId, isActive: true })
        .sort({ 'stats.purchases': -1 }).limit(5),
      Order.find({ store: req.params.storeId })
        .sort({ createdAt: -1 }).limit(10)
        .populate('buyer', 'name')
    ]);

    const totalRevenue = orders.filter(o => o.payment.status === 'completed')
      .reduce((sum, o) => sum + o.pricing.total, 0);
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    // Chati ya mauzo kwa siku
    const salesByDay = {};
    orders.forEach(order => {
      const day = order.createdAt.toISOString().split('T')[0];
      if (!salesByDay[day]) salesByDay[day] = { orders: 0, revenue: 0 };
      salesByDay[day].orders++;
      if (order.payment.status === 'completed') salesByDay[day].revenue += order.pricing.total;
    });

    res.json({
      success: true,
      overview: { totalRevenue, totalOrders, completedOrders, cancelledOrders },
      salesByDay: Object.entries(salesByDay).map(([date, data]) => ({ date, ...data })),
      topProducts,
      recentOrders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
