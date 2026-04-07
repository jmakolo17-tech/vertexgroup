const mongoose = require('mongoose');

const corporateSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  country:         { type: String, required: true, trim: true },
  sector:          { type: String, trim: true },
  partnershipType: {
    type: String,
    enum: ['Sponsor', 'Training partner', 'Distribution', 'Investor', 'Other'],
    default: 'Sponsor',
  },
  status: {
    type: String,
    enum: ['Active', 'Prospecting', 'Negotiating', 'Inactive', 'New'],
    default: 'New',
  },
  contactPerson: { type: String, trim: true },
  contactEmail:  { type: String, trim: true, lowercase: true },
  contactPhone:  { type: String, trim: true },
  website:       { type: String, trim: true },
  notes:         { type: String, trim: true },
  commitmentAmount: { type: Number, default: 0 },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

corporateSchema.index({ country: 1 });
corporateSchema.index({ status: 1 });

module.exports = mongoose.model('Corporate', corporateSchema);
