const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_lead', 'new_diagnostic', 'deal_won', 'deal_lost', 'kpi_alert',
           'new_quote', 'proposal_sent', 'follow_up', 'new_subscriber', 'system'],
    required: true,
  },
  title:   { type: String, required: true },
  body:    { type: String },
  link:    { type: String },           // e.g. /leads/abc123
  isRead:  { type: Boolean, default: false },

  // Who it's for (null = all admins)
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Related documents
  relatedLead:       { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  relatedDiagnostic: { type: mongoose.Schema.Types.ObjectId, ref: 'Diagnostic' },
  relatedClient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
}, { timestamps: true });

notificationSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
