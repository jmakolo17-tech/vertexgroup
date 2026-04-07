const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'salesperson', 'coach', 'viewer', 'business_developer'],
    default: 'salesperson',
  },
  countries:   { type: [String], default: [] },
  initials:    { type: String, trim: true },
  isActive:    { type: Boolean, default: true },
  lastLoginAt: { type: Date },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain password with hash
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Auto-generate initials
userSchema.pre('save', function (next) {
  if (!this.initials) {
    this.initials = this.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
