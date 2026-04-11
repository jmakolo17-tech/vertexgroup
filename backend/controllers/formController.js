const Form           = require('../models/Form');
const FormSubmission = require('../models/FormSubmission');

// ── Admin: list all forms ─────────────────────────────────────────────────────
exports.getForms = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Form.countDocuments(filter);
    const forms = await Form.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-fields'); // exclude fields for list view
    res.json({ success: true, total, forms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: get single form (with fields) ─────────────────────────────────────
exports.getForm = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    res.json({ success: true, form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: create form ────────────────────────────────────────────────────────
exports.createForm = async (req, res) => {
  try {
    const { title, description, activityType, instructions, fields, status, closedMessage } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Form title is required.' });
    }
    const form = await Form.create({
      title: title.trim(),
      description:  description  || '',
      activityType: activityType || '',
      instructions: instructions || '',
      fields:       fields       || [],
      status:       status       || 'draft',
      closedMessage,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: update form ────────────────────────────────────────────────────────
exports.updateForm = async (req, res) => {
  try {
    const form = await Form.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    res.json({ success: true, form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: delete form ────────────────────────────────────────────────────────
exports.deleteForm = async (req, res) => {
  try {
    const form = await Form.findByIdAndDelete(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    await FormSubmission.deleteMany({ form: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: get form submissions ───────────────────────────────────────────────
exports.getSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await FormSubmission.countDocuments({ form: req.params.id });
    const submissions = await FormSubmission.find({ form: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({ success: true, total, submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: export submissions as CSV ─────────────────────────────────────────
exports.exportSubmissions = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    const submissions = await FormSubmission.find({ form: req.params.id }).sort({ createdAt: -1 });

    const headers = ['Submitted At', ...form.fields.map(f => f.label)];
    const rows = submissions.map(s => {
      const cols = [new Date(s.createdAt).toISOString()];
      form.fields.forEach(f => {
        const val = s.data[f.label] ?? '';
        cols.push(String(val).replace(/"/g, '""'));
      });
      return cols.map(c => `"${c}"`).join(',');
    });

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="submissions-${form.slug}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Public: get form by slug (no auth) ───────────────────────────────────────
exports.getPublicForm = async (req, res) => {
  try {
    const form = await Form.findOne({ slug: req.params.slug })
      .select('title description activityType instructions fields status closedMessage slug');
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    res.json({ success: true, form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Public: submit form (no auth) ─────────────────────────────────────────────
exports.submitForm = async (req, res) => {
  try {
    const form = await Form.findOne({ slug: req.params.slug });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    if (form.status !== 'active') {
      return res.status(403).json({ success: false, message: form.closedMessage || 'This form is not accepting responses.' });
    }

    // Basic required field validation
    const data = req.body.data || {};
    const missing = form.fields
      .filter(f => f.required && !data[f.label] && data[f.label] !== 0 && data[f.label] !== false)
      .map(f => f.label);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Required: ${missing.join(', ')}` });
    }

    const submission = await FormSubmission.create({
      form:        form._id,
      formSlug:    form.slug,
      data,
      submitterIp: req.ip,
      userAgent:   req.headers['user-agent'],
    });

    await Form.findByIdAndUpdate(form._id, { $inc: { submissionCount: 1 } });

    res.status(201).json({ success: true, message: 'Thank you! Your response has been submitted.', submissionId: submission._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
