const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage kwa picha za bidhaa
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ost-v2/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }]
  }
});

// Storage kwa video za bidhaa
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ost-v2/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'webm'],
    transformation: [{ quality: 'auto' }]
  }
});

// Storage kwa logos na banners
const storeStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ost-v2/stores',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto' }]
  }
});

// Storage kwa avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ost-v2/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }]
  }
});

// File size limits
const limits = { fileSize: 10 * 1024 * 1024 }; // 10MB

exports.uploadProductImages = multer({ storage: productStorage, limits }).array('images', 10);
exports.uploadProductVideo = multer({ storage: videoStorage, limits: { fileSize: 50 * 1024 * 1024 } }).single('video');
exports.uploadStoreLogo = multer({ storage: storeStorage, limits }).single('logo');
exports.uploadStoreBanner = multer({ storage: storeStorage, limits }).single('banner');
exports.uploadAvatar = multer({ storage: avatarStorage, limits }).single('avatar');

// Futa file kutoka Cloudinary
exports.deleteFile = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

exports.cloudinary = cloudinary;
