const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Jina linahitajika'],
    trim: true,
    maxlength: [100, 'Jina ni refu sana']
  },
  email: {
    type: String,
    required: [true, 'Email inahitajika'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email si sahihi']
  },
  phone: {
    type: String,
    required: [true, 'Namba ya simu inahitajika'],
    match: [/^(\+255|0)[67]\d{8}$/, 'Namba ya simu si sahihi (Tanzania)']
  },
  password: {
    type: String,
    required: [true, 'Neno la siri linahitajika'],
    minlength: [8, 'Neno la siri lazima liwe na herufi 8+'],
    select: false
  },
  role: {
    type: String,
    enum: ['buyer', 'merchant', 'admin'],
    default: 'buyer'
  },
  avatar: {
    url: String,
    publicId: String
  },
  region: {
    type: String,
    enum: [
      'Arusha','Dar es Salaam','Dodoma','Geita','Iringa',
      'Kagera','Katavi','Kigoma','Kilimanjaro','Lindi',
      'Manyara','Mara','Mbeya','Morogoro','Mtwara',
      'Mwanza','Njombe','Pemba Kaskazini','Pemba Kusini',
      'Pwani','Rukwa','Ruvuma','Shinyanga','Simiyu',
      'Singida','Songwe','Tabora','Tanga',
      'Unguja Kaskazini','Unguja Kusini','Mjini Magharibi'
    ]
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  // Push notification subscription
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  },

  // Multi-step verification tokens
  verificationToken: String,
  verificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  // Deletion verification (Danger Zone)
  deletionCode: String,
  deletionCodeExpires: Date,
  deletionConfirmedAt: Date,

  lastLogin: Date

}, { timestamps: true });

// Hash password kabla ya kuhifadhi
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Linganisha password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
