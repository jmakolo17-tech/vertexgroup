const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  label:    String,
  current:  Number,
  target:   Number,
  unit:     { type: String, default: '%' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const clientSchema = new mongoose.Schema({
  company:     { type: String, required: true, trim: true },
  contactName: { type: String, trim: true },
  email:       { type: String, lowercase: true, trim: true },
  phone:       { type: String, trim: true },
  country:     { type: String, trim: true },
  industry:    { type: String, trim: true },

  // Engagement
  plan:        { type: String, trim: true },         // 3 Months | 6 Months | 1 Year+
  startDate:   { type: Date },
  endDate:     { type: Date },
  value:       { type: Number, default: 0 },
  currency:    { type: String, default: 'USD' },

  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'at_risk'],
    default: 'active',
  },

  // KPI tracking
  kpis: [kpiSchema],

  // Assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Donor / grant flag
  isDonorFunded: { type: Boolean, default: false },
  donorName:     { type: String, trim: true },

  // Linked lead / diagnostic
  lead:       { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  diagnostic: { type: mongoose.Schema.Types.ObjectId, ref: 'Diagnostic' },

  notes: { type: String, trim: true },
}, { timestamps: true });

clientSchema.index({ status: 1 });
clientSchema.index({ country: 1 });

module.exports = mongoose.model('Client', clientSchema);
