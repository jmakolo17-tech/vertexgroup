const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const leadSchema = new mongoose.Schema({
  // Contact info
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  company: { type: String, trim: true },
  phone:   { type: String, trim: true },
  country: { type: String, trim: true },

  // Lead metadata
  type: {
    type: String,
    enum: ['contact', 'quote', 'diagnostic', 'newsletter'],
    default: 'contact',
  },
  source:  { type: String, default: 'website' },   // website | referral | event | cold
  service: { type: String, trim: true },            // which service they're interested in
  plan:    { type: String, trim: true },            // Free | 3 Months | 6 Months | 1 Year+
  message: { type: String, trim: true },

  // Pipeline
  stage: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'],
    default: 'new',
  },
  value:       { type: Number, default: 0 },        // expected deal value in USD
  currency:    { type: String, default: 'USD' },
  probability: { type: Number, default: 10 },       // 0–100 %

  // Assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  language:   { type: String, enum: ['en', 'fr'], default: 'en' },

  // Quote-specific
  companySize: { type: String },
  revenue:     { type: String },

  // File attachments (diagnostic uploads)
  attachments: [{ filename: String, mimetype: String, size: Number, path: String }],

  // Notes / activity log
  notes: [noteSchema],

  // Flags
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

leadSchema.index({ email: 1 });
leadSchema.index({ stage: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
