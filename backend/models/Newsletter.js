const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:      { type: String, trim: true },
  language:  { type: String, enum: ['en', 'fr'], default: 'en' },
  country:   { type: String, trim: true },
  isActive:  { type: Boolean, default: true },
  source:    { type: String, default: 'website' },
  unsubscribedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Newsletter', newsletterSchema);
