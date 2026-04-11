const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  label:    { type: String, required: true },
  type:     { type: String, enum: ['text','email','phone','number','textarea','select','checkbox','date','file'], default: 'text' },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
  options:  [{ type: String }], // for 'select' type
  order:    { type: Number, default: 0 },
}, { _id: true });

const formSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  description:  { type: String, trim: true },
  activityType: { type: String, trim: true }, // e.g. "Job Application", "Event Registration"
  instructions: { type: String, trim: true }, // shown at top of public form
  slug:         { type: String, unique: true, lowercase: true },
  fields:       [fieldSchema],
  status:       { type: String, enum: ['draft','active','closed'], default: 'draft' },
  closedMessage:{ type: String, default: 'This form is no longer accepting responses.' },
  submissionCount: { type: Number, default: 0 },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-generate slug from title before save
formSchema.pre('save', async function (next) {
  if (!this.isModified('title') && this.slug) return next();
  const base = this.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 60);
  let slug = base;
  let n = 1;
  while (await mongoose.model('Form').findOne({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${n++}`;
  }
  this.slug = slug;
  next();
});

module.exports = mongoose.model('Form', formSchema);
