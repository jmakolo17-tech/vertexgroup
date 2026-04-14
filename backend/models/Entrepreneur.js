const mongoose = require('mongoose');

const programmeEntrySchema = new mongoose.Schema({
  programmeName: { type: String },
  incubator:     { type: String },
  stage:         { type: String, enum: ['applied','active','graduated','dropped'], default: 'active' },
  startDate:     { type: Date },
  endDate:       { type: Date },
  sector:        { type: String },
  notes:         { type: String },
}, { _id: true });

const fundingEntrySchema = new mongoose.Schema({
  amount:    { type: Number },
  currency:  { type: String, default: 'USD' },
  investor:  { type: String },
  type:      { type: String }, // grant, equity, debt, prize
  date:      { type: Date },
  notes:     { type: String },
}, { _id: true });

const entrepreneurSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, trim: true, lowercase: true },
  phone:        { type: String, trim: true },
  country:      { type: String, trim: true },
  city:         { type: String, trim: true },
  sector:       { type: String, trim: true },
  companyName:  { type: String, trim: true },
  gender:       { type: String, enum: ['Male','Female','Non-binary','Prefer not to say',''], default: '' },
  programmes:   [programmeEntrySchema],
  funding:      [fundingEntrySchema],
  totalFunding: { type: Number, default: 0 }, // cached sum
  source:       { type: String, trim: true }, // which incubator uploaded this record
  tags:         [{ type: String }],
  addedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index for deduplication by email
entrepreneurSchema.index({ email: 1 }, { sparse: true });
entrepreneurSchema.index({ name: 1 });

module.exports = mongoose.model('Entrepreneur', entrepreneurSchema);
