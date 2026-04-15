const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');

// POST /api/reviews - Create a new review
router.post('/', async (req, res) => {
  const { productId, userId, rating, comment } = req.body;

  try {
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user exists (assuming you have a User model and authentication middleware)
    // For now, we'll assume userId is valid

    const newReview = new Review({
      productId,
      userId,
      rating,
      comment,
    });

    await newReview.save();
    res.status(201).json(newReview);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/reviews/product/:productId - Get all reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).populate('userId', 'name email'); // Populate user details
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/reviews/user/:userId - Get all reviews by a user
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.params.userId });
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE /api/reviews/:id - Delete a review (e.g., by admin or the user who posted it)
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Add authorization logic here (e.g., check if req.user.id === review.userId or if user is admin)

    await review.remove();
    res.json({ message: 'Review removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
