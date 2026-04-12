const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  visitors: {
    total: { type: Number, default: 0 },
    unique: { type: Number, default: 0 },
    returning: { type: Number, default: 0 }
  },
  pageViews: { type: Number, default: 0 },
  productViews: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    count: { type: Number, default: 0 }
  }],
  orders: {
    count: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 }
  },
  topProducts: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sales: Number,
    revenue: Number
  }],
  trafficSources: {
    direct: { type: Number, default: 0 },
    social: { type: Number, default: 0 },
    search: { type: Number, default: 0 },
    referral: { type: Number, default: 0 }
  },
  deviceTypes: {
    mobile: { type: Number, default: 0 },
    desktop: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  },
  regions: [{
    name: String,
    visitors: Number,
    orders: Number
  }]
}, {
  timestamps: true
});

// Index kwa store + date queries
analyticsSchema.index({ store: 1, date: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
