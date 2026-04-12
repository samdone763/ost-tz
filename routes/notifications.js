const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const User = require('../models/User');
const Order = require('../models/Order');
const Store = require('../models/Store');
const { protect } = require('../middleware/auth');

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Helper: tuma notification kwa user mmoja
const sendNotification = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    if (!user?.pushSubscription?.endpoint) return;

    await webpush.sendNotification(
      user.pushSubscription,
      JSON.stringify(payload)
    );
  } catch (error) {
    if (error.statusCode === 410) {
      // Subscription imekwisha — ifute
      await User.findByIdAndUpdate(userId, { pushSubscription: null });
    }
  }
};

// ─── POST /api/notifications/order-update ─────────────
// Inapigiwa na orders route baada ya status update
router.post('/order-update', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId)
      .populate('store', 'name owner')
      .populate('buyer', 'name');

    if (!order) return res.status(404).json({ success: false });

    const statusMessages = {
      confirmed:          { title: '✅ Oda Imekubaliwa', body: `${order.store.name} amekubali oda yako #${order.orderNumber}` },
      processing:         { title: '📦 Inafungashwa', body: `Oda yako #${order.orderNumber} inafungashwa sasa` },
      shipped:            { title: '🚚 Imesafirishwa', body: `Oda yako #${order.orderNumber} ipo njiani` },
      out_for_delivery:   { title: '🏍️ Iko Karibu Nawe!', body: `Oda yako #${order.orderNumber} inakuja kwako sasa` },
      delivered:          { title: '🎉 Imefikishwa!', body: `Oda yako #${order.orderNumber} imefikishwa. Asante!` },
      cancelled:          { title: '❌ Oda Imefutwa', body: `Oda #${order.orderNumber} imefutwa` }
    };

    const msg = statusMessages[order.status];
    if (!msg) return res.json({ success: true, sent: false });

    const payload = {
      ...msg,
      orderNumber: order.orderNumber,
      url: `/track.html?order=${order.orderNumber}`,
      timestamp: new Date().toISOString()
    };

    // Tuma kwa buyer
    if (order.buyer) {
      await sendNotification(order.buyer._id, payload);
    }

    // Tuma kwa merchant (oda mpya)
    if (order.status === 'pending') {
      await sendNotification(order.store.owner, {
        title: '🛍️ Oda Mpya!',
        body: `Oda mpya #${order.orderNumber} — TZS ${order.pricing.total.toLocaleString()}`,
        url: `/admin/orders.html`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, sent: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/notifications/vapid-public-key ──────────
router.get('/vapid-public-key', (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
