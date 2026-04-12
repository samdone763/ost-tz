const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name: String, // e.g., "Rangi", "Saizi", "Uzito"
  options: [{
    label: String,       // e.g., "Nyekundu", "XL", "1kg"
    priceModifier: { type: Number, default: 0 }, // +/- kwenye bei ya msingi
    stock: { type: Number, default: 0 },
    sku: String,
    image: { url: String, publicId: String }
  }]
}, { _id: false });

const productSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Jina la bidhaa linahitajika'],
    trim: true,
    maxlength: [200, 'Jina ni refu sana']
  },
  slug: { type: String, lowercase: true },
  description: {
    type: String,
    maxlength: [3000, 'Maelezo ni marefu sana']
  },
  category: {
    type: String,
    required: [true, 'Aina ya bidhaa inahitajika']
  },
  subcategory: String,
  tags: [String],

  // Bei
  price: {
    original: { type: Number, required: [true, 'Bei inahitajika'] },
    discounted: Number,
    currency: { type: String, default: 'TZS' }
  },

  // Picha na Video
  media: [{
    url: { type: String, required: true },
    publicId: String,
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    isPrimary: { type: Boolean, default: false },
    caption: String
  }],

  // Variants — rangi, saizi, uzito, n.k.
  variants: [variantSchema],

  // Stock management
  stock: {
    quantity: { type: Number, default: 0 },
    trackStock: { type: Boolean, default: true },
    allowBackorder: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, default: 5 }
  },

  // Shipping info
  shipping: {
    weight: Number,       // kg
    dimensions: {
      length: Number,     // cm
      width: Number,
      height: Number
    },
    freeShipping: { type: Boolean, default: false }
  },

  // SEO
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },

  stats: {
    views: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 }
  },

  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isOnSale: { type: Boolean, default: false }

}, { timestamps: true });

// Indexes kwa search ya haraka
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ store: 1, isActive: 1 });
productSchema.index({ 'price.original': 1 });
productSchema.index({ 'stats.purchases': -1 });

// Auto slug
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
