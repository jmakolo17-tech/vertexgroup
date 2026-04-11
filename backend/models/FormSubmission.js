const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema({
  form:        { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true, index: true },
  formSlug:    { type: String }, // denormalized for quick lookup
  data:        { type: mongoose.Schema.Types.Mixed, default: {} }, // { fieldLabel: value }
  submitterIp: { type: String },
  userAgent:   { type: String },
}, { timestamps: true });

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);
