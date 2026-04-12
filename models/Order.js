const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  image: String,
  price: Number,
  quantity: { type: Number, default: 1 },
  selectedVariants: [{
    variantName: String,
    optionLabel: String,
    priceModifier: Number
  }],
  subtotal: Number
}, { _id: false });

const trackingEventSchema = new mongoose.Schema({
  status: String,
  message: String,
  location: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  items: [orderItemSchema],

  // Customer info (kwa guest checkout pia)
  customerInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    region: String,
    district: String,
    address: { type: String, required: true },
    coordinates: { lat: Number, lng: Number },
    notes: String
  },

  // Bei
  pricing: {
    subtotal: Number,
    deliveryFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'TZS' }
  },

  // Malipo
  payment: {
    method: {
      type: String,
      enum: ['mpesa','tigo_pesa','airtel_money','halopesa','card','cash_on_delivery'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending','processing','completed','failed','refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date,
    phoneNumber: String // kwa mobile money
  },

  // Hali ya oda
  status: {
    type: String,
    enum: [
      'pending',       // Oda imepokelewa
      'confirmed',     // Muuzaji amekubali
      'processing',    // Inatayarishwa
      'shipped',       // Imesafirishwa
      'out_for_delivery', // Iko njiani
      'delivered',     // Imefikishwa
      'cancelled',     // Imefutwa
      'refunded'       // Imerudishiwa pesa
    ],
    default: 'pending'
  },

  // Tracking history — hatua kwa hatua
  tracking: [trackingEventSchema],

  // Estimated delivery
  estimatedDelivery: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: String,

  // Review
  isReviewed: { type: Boolean, default: false }

}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 9000) + 1000;
    this.orderNumber = `OST${year}${month}${random}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
