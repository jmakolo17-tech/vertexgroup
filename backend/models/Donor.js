const mongoose = require('mongoose');

const smeEngagementSchema = new mongoose.Schema({
  smeName:    { type: String, required: true, trim: true },
  smeCountry: { type: String, trim: true },
  smeSector:  { type: String, trim: true },
  amount:     { type: Number, default: 0 },
  objective:  { type: String, trim: true },
  kpiLabel:   { type: String, trim: true },   // e.g. "20 jobs by Dec"
  kpiCurrent: { type: Number, default: 0 },
  kpiTarget:  { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['On track', 'At risk', 'Near done', 'Completed', 'Stalled'],
    default: 'On track',
  },
}, { timestamps: true });

const donorSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  acronym:          { type: String, trim: true },           // e.g. "UNDP", "GIZ"
  type: {
    type: String,
    enum: ['International org', 'Government', 'Foundation', 'Private fund', 'Other'],
    default: 'International org',
  },
  status: {
    type: String,
    enum: ['Active', 'Prospect', 'Completed', 'Inactive'],
    default: 'Active',
  },
  totalCommitment:  { type: Number, default: 0 },           // USD
  countries:        { type: [String], default: [] },
  contactPerson:    { type: String, trim: true },
  contactEmail:     { type: String, trim: true, lowercase: true },
  notes:            { type: String, trim: true },
  smeEngagements:   [smeEngagementSchema],
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

donorSchema.index({ status: 1 });

module.exports = mongoose.model('Donor', donorSchema);
