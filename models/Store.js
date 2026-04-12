const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Jina la biashara linahitajika'],
    trim: true,
    maxlength: [100, 'Jina ni refu sana']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [1000, 'Maelezo ni marefu sana']
  },
  category: {
    type: String,
    required: [true, 'Aina ya biashara inahitajika'],
    enum: [
      'fashion','electronics','food','beauty','health',
      'home','sports','books','automotive','agriculture',
      'services','art','jewelry','babies','other'
    ]
  },
  logo: { url: String, publicId: String },
  banner: { url: String, publicId: String },
  gallery: [{
    url: String,
    publicId: String,
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    caption: String
  }],

  contact: {
    phone: String,
    whatsapp: String,
    email: String,
    instagram: String,
    facebook: String
  },

  location: {
    region: String,
    district: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Delivery settings
  delivery: {
    available: { type: Boolean, default: false },
    freeDeliveryThreshold: { type: Number, default: 0 },
    regions: [{
      name: String,
      fee: Number,
      estimatedDays: String
    }]
  },

  // Payment methods accepted
  paymentMethods: {
    mpesa: { type: Boolean, default: false },
    tigoPesa: { type: Boolean, default: false },
    airtelMoney: { type: Boolean, default: false },
    halopesa: { type: Boolean, default: false },
    card: { type: Boolean, default: false },
    cashOnDelivery: { type: Boolean, default: true }
  },

  settings: {
    theme: { type: String, default: 'default' },
    currency: { type: String, default: 'TZS' },
    language: { type: String, enum: ['sw', 'en', 'both'], default: 'both' }
  },

  stats: {
    totalProducts: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },

  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false }

}, { timestamps: true });

// Auto-generate slug kutoka kwa jina
storeSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

module.exports = mongoose.model('Store', storeSchema);
