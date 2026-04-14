const mongoose = require('mongoose');

const programmeEntrySchema = new mongoose.Schema({
  programmeName: { type: String },
  incubator:     { type: String },
  year:          { type: Number },
  donor:         { type: String },
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
  type:      { type: String },
  date:      { type: Date },
  notes:     { type: String },
}, { _id: true });

const entrepreneurSchema = new mongoose.Schema({
  // Core identity
  firstName:     { type: String, trim: true },
  surname:       { type: String, trim: true },
  name:          { type: String, required: true, trim: true }, // computed: firstName + surname
  age:           { type: Number },                              // current age

  // Contact
  email:         { type: String, trim: true, lowercase: true },
  phone:         { type: String, trim: true },

  // Location
  country:       { type: String, trim: true },
  city:          { type: String, trim: true },

  // Business
  companyName:   { type: String, trim: true },
  description:   { type: String, trim: true },    // company / project description
  website:       { type: String, trim: true },
  sector:        { type: String, trim: true },
  gender:        { type: String, enum: ['Male','Female','Non-binary','Prefer not to say',''], default: '' },
  businessStage: { type: String, enum: ['idea','early','growth','scale','mature',''], default: '' },
  yearFounded:   { type: Number },
  employees:     { type: Number },
  revenue:       { type: Number },
  turnover:      { type: Number },

  // Programme history
  programmes:    [programmeEntrySchema],
  funding:       [fundingEntrySchema],
  totalFunding:  { type: Number, default: 0 },

  source:        { type: String, trim: true },
  tags:          [{ type: String }],
  addedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

entrepreneurSchema.index({ email: 1 }, { sparse: true });
entrepreneurSchema.index({ name: 1 });
entrepreneurSchema.index({ source: 1 });
entrepreneurSchema.index({ country: 1 });

module.exports = mongoose.model('Entrepreneur', entrepreneurSchema);
