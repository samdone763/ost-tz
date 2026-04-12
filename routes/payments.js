const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const { optionalAuth } = require('../middleware/auth');

// Helper: Selcom API signature
const generateSelcomSignature = (payload, secret) => {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
};

// ─── POST /api/payments/initiate ──────────────────────
// Anzisha malipo (M-Pesa, Tigo, Airtel, Halopesa)
router.post('/initiate', optionalAuth, async (req, res) => {
  try {
    const { orderId, method, phoneNumber } = req.body;

    const order = await Order.findById(orderId).populate('store', 'name');
    if (!order) return res.status(404).json({ success: false, message: 'Oda haipatikani' });

    if (order.payment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Oda hii imelipwa tayari' });
    }

    // Format simu number kwa Tanzania
    let formattedPhone = phoneNumber.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '255' + formattedPhone.slice(1);
    }
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.slice(1);
    }

    // ─── Selcom Sandbox Request ────────────────────────
    const payload = {
      vendor: process.env.SELCOM_VENDOR || 'OSTV2TEST',
      order_id: order.orderNumber,
      buyer_email: order.customerInfo.email || 'noemail@ost.co.tz',
      buyer_name: order.customerInfo.name,
      buyer_phone: formattedPhone,
      amount: order.pricing.total,
      currency: 'TZS',
      payment_methods: method === 'mpesa' ? 'MPESA' :
                       method === 'tigo_pesa' ? 'TIGOPESA' :
                       method === 'airtel_money' ? 'AIRTELMONEY' :
                       method === 'halopesa' ? 'HALOPESA' : 'ALL',
      redirect_url: `${process.env.FRONTEND_URL}/track.html?order=${order.orderNumber}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout.html`,
      webhook: `${process.env.BACKEND_URL || 'https://onlinestores-backend.onrender.com'}/api/payments/webhook`
    };

    // Update order na payment info
    await Order.findByIdAndUpdate(orderId, {
      'payment.method': method,
      'payment.phoneNumber': formattedPhone,
      'payment.status': 'processing'
    });

    // SANDBOX MODE — simulate response
    if (process.env.NODE_ENV !== 'production' || !process.env.SELCOM_API_KEY) {
      console.log('💳 SANDBOX: Malipo ya mazoezi —', payload);
      return res.json({
        success: true,
        sandbox: true,
        message: 'SANDBOX MODE — Katika production, SMS itatumwa kwa simu yako',
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.pricing.total,
        phone: formattedPhone,
        method,
        // Simulate payment URL
        paymentUrl: `${process.env.FRONTEND_URL}/checkout.html?simulate=true&order=${order.orderNumber}`
      });
    }

    // PRODUCTION — Selcom API call halisi
    const response = await fetch(`${process.env.SELCOM_BASE_URL}/checkout/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `SELCOM ${process.env.SELCOM_API_KEY}`,
        'Digest-Method': 'HS256',
        'Digest': generateSelcomSignature(payload, process.env.SELCOM_API_SECRET),
        'Timestamp': new Date().toISOString()
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.result === '000') {
      res.json({
        success: true,
        paymentUrl: data.data?.payment_gateway_url,
        reference: data.data?.reference,
        orderNumber: order.orderNumber
      });
    } else {
      throw new Error(data.message || 'Hitilafu ya malipo');
    }

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/payments/webhook ───────────────────────
// Selcom itatuma hapa baada ya malipo
router.post('/webhook', async (req, res) => {
  try {
    const { order_id, result, reference } = req.body;

    const order = await Order.findOne({ orderNumber: order_id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (result === '000') {
      // Malipo yamefanikiwa
      await Order.findByIdAndUpdate(order._id, {
        'payment.status': 'completed',
        'payment.transactionId': reference,
        'payment.paidAt': new Date(),
        status: 'confirmed',
        $push: {
          tracking: {
            status: 'confirmed',
            message: 'Malipo yamepokelewa. Muuzaji amearifiwa.',
            timestamp: new Date()
          }
        }
      });
    } else {
      await Order.findByIdAndUpdate(order._id, {
        'payment.status': 'failed'
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/payments/simulate ──────────────────────
// Kwa testing — simulate malipo yaliyofanikiwa
router.post('/simulate', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    const order = await Order.findOne({ orderNumber });
    if (!order) return res.status(404).json({ success: false, message: 'Oda haipatikani' });

    await Order.findByIdAndUpdate(order._id, {
      'payment.status': 'completed',
      'payment.transactionId': `SIM-${Date.now()}`,
      'payment.paidAt': new Date(),
      status: 'confirmed',
      $push: {
        tracking: {
          status: 'confirmed',
          message: '[SANDBOX] Malipo ya mazoezi yamefanikiwa.',
          timestamp: new Date()
        }
      }
    });

    res.json({ success: true, message: 'Simulation ya malipo imefanikiwa' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/payments/:orderNumber/status ────────────
router.get('/:orderNumber/status', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .select('payment.status payment.paidAt orderNumber pricing.total');

    if (!order) return res.status(404).json({ success: false, message: 'Oda haipatikani' });

    res.json({ success: true, payment: order.payment, orderNumber: order.orderNumber });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
