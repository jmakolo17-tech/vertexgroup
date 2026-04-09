const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 0 },
  unitPrice:   { type: Number, required: true, min: 0 },
  amount:      { type: Number, required: true },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  client: {
    name:    { type: String, required: true },
    email:   { type: String, required: true },
    company: { type: String },
    address: { type: String },
    country: { type: String },
  },
  items:     { type: [lineItemSchema], default: [] },
  subtotal:  { type: Number, default: 0 },
  taxRate:   { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total:     { type: Number, default: 0 },
  currency:  { type: String, default: 'USD' },
  status:    { type: String, enum: ['draft','sent','paid','overdue'], default: 'draft' },
  dueDate:   { type: Date },
  notes:     { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const year  = new Date().getFullYear();
    const count = await this.constructor.countDocuments({ invoiceNumber: new RegExp(`^VGA-${year}-`) });
    this.invoiceNumber = `VGA-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
