const Lead = require('../models/Lead');
const Notification = require('../models/Notification');
const { sendEmail, newLeadNotification } = require('../utils/email');

// ── Public: website form submissions ─────────────────────────────────────────

// POST /api/leads/contact
exports.submitContact = async (req, res) => {
  try {
    const { name, email, company, country, phone, service, message, language } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required' });
    }

    const lead = await Lead.create({
      name, email, company, country, phone, service, message,
      language: language || 'en',
      type: 'contact',
      source: 'website',
      stage: 'new',
    });

    // Notify team via email (fire-and-forget)
    sendEmail(newLeadNotification(lead));

    // Create dashboard notification
    await Notification.create({
      type: 'new_lead',
      title: `New contact from ${name}${company ? ' · ' + company : ''}`,
      body: message?.slice(0, 120),
      relatedLead: lead._id,
    });

    res.status(201).json({ success: true, message: 'Message received. We will be in touch shortly.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/leads/quote
exports.submitQuote = async (req, res) => {
  try {
    const { name, email, company, country, phone, plan, companySize, revenue, message, language } = req.body;
    if (!name || !email || !company) {
      return res.status(400).json({ success: false, message: 'Name, email and company are required' });
    }

    const lead = await Lead.create({
      name, email, company, country, phone, plan, companySize, revenue, message,
      language: language || 'en',
      type: 'quote',
      source: 'website',
      stage: 'new',
    });

    sendEmail(newLeadNotification(lead));

    await Notification.create({
      type: 'new_quote',
      title: `New quote request — ${name} (${company})`,
      body: `Plan: ${plan || '—'} · ${country || '—'}`,
      relatedLead: lead._id,
    });

    res.status(201).json({ success: true, message: 'Quote request received. We will respond within 24 hours.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Protected: dashboard CRUD ─────────────────────────────────────────────────

// POST /api/leads — manually create a lead from the dashboard
exports.createLead = async (req, res) => {
  try {
    const { name, email, company, country, phone, service, plan, value, probability, stage, assignedTo, notes, language } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const lead = await Lead.create({
      name, email, company, country, phone, service, plan,
      value:       parseFloat(value)       || 0,
      probability: parseFloat(probability) || 10,
      stage:       stage || 'new',
      assignedTo:  assignedTo || null,
      language:    language || 'en',
      type:        'contact',
      source:      'dashboard',
    });

    if (notes) {
      lead.notes.push({ text: notes, createdBy: req.user._id });
      await lead.save();
    }

    await Notification.create({
      type:  'new_lead',
      title: `Lead added manually — ${name}${company ? ' · ' + company : ''}`,
      body:  `Added by ${req.user.name}`,
      relatedLead: lead._id,
    });

    const populated = await Lead.findById(lead._id).populate('assignedTo', 'name initials role');
    res.status(201).json({ success: true, lead: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/leads
exports.getLeads = async (req, res) => {
  try {
    const { stage, type, assignedTo, search, page = 1, limit = 25 } = req.query;
    const filter = { isArchived: false };

    if (stage)      filter.stage = stage;
    if (type)       filter.type = type;
    if (assignedTo) filter.assignedTo = assignedTo;

    // Salespeople only see their own leads
    if (['salesperson', 'coach'].includes(req.user.role)) {
      filter.assignedTo = req.user._id;
    }

    if (search) {
      filter.$or = [
        { name:    { $regex: search, $options: 'i' } },
        { email:   { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Lead.countDocuments(filter);
    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name initials role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), leads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leads/:id
exports.getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name initials role');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/leads/:id
exports.updateLead = async (req, res) => {
  try {
    const allowed = ['stage', 'assignedTo', 'value', 'probability', 'service', 'plan', 'notes'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const lead = await Lead.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('assignedTo', 'name initials role');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // If moved to 'won', create notification
    if (updates.stage === 'won') {
      await Notification.create({
        type: 'deal_won',
        title: `Deal won — ${lead.name}${lead.company ? ' (' + lead.company + ')' : ''} $${lead.value || 0}`,
        body: `Salesperson: ${req.user.name}`,
        relatedLead: lead._id,
      });
    }

    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/leads/:id/notes
exports.addNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Note text required' });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    lead.notes.push({ text, createdBy: req.user._id });
    await lead.save();

    res.json({ success: true, notes: lead.notes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/leads/:id (archive only)
exports.archiveLead = async (req, res) => {
  try {
    await Lead.findByIdAndUpdate(req.params.id, { isArchived: true });
    res.json({ success: true, message: 'Lead archived' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
