const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
  images: [{ url: String, publicId: String }],
  isVerifiedPurchase: { type: Boolean, default: false },
  merchantReply: {
    text: String,
    repliedAt: Date
  },
  helpful: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true }
}, { timestamps: true });

reviewSchema.index({ store: 1, createdAt: -1 });
reviewSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
