const mongoose = require('mongoose');

const dimensionSchema = new mongoose.Schema({
  id:              String,
  title:           String,
  score:           Number,
  severity:        { type: String, enum: ['Critical', 'Medium', 'Strong'] },
  summary:         String,
  analysis:        String,
  recommendations: [String],
}, { _id: false });

const diagnosticSchema = new mongoose.Schema({
  // Requester
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  company: { type: String, required: true, trim: true },
  country: { type: String, trim: true },
  phone:   { type: String, trim: true },

  // Business context
  industry:   { type: String, trim: true },
  challenge:  { type: String, trim: true },
  employees:  { type: String },
  revenue:    { type: String },
  language:   { type: String, enum: ['en', 'fr'], default: 'en' },

  // Uploaded docs
  attachments: [{ filename: String, mimetype: String, size: Number, path: String }],

  // AI result
  overallScore:     { type: Number, min: 0, max: 100 },
  scoreLabel:       String,
  executiveSummary: String,
  growthPotential:  String,
  vertexRecommendation: String,
  dimensions:       [dimensionSchema],

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },

  // Linked lead (auto-created when diagnostic is submitted)
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },

  // Email delivery
  emailSentAt: { type: Date },
}, { timestamps: true });

diagnosticSchema.index({ email: 1 });
diagnosticSchema.index({ status: 1 });
diagnosticSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Diagnostic', diagnosticSchema);
