const Client = require('../models/Client');
const Notification = require('../models/Notification');

// GET /api/clients
exports.getClients = async (req, res) => {
  try {
    const { status, country, assignedTo, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (status)     filter.status = status;
    if (country)    filter.country = country;
    if (assignedTo) filter.assignedTo = assignedTo;

    if (['salesperson', 'coach'].includes(req.user.role)) {
      filter.assignedTo = req.user._id;
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Client.countDocuments(filter);
    const clients = await Client.find(filter)
      .populate('assignedTo', 'name initials')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), clients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/clients/:id
exports.getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('assignedTo', 'name initials role')
      .populate('lead')
      .populate('diagnostic', 'overallScore scoreLabel dimensions');
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/clients
exports.createClient = async (req, res) => {
  try {
    const client = await Client.create({ ...req.body });
    res.status(201).json({ success: true, client });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/clients/:id
exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    // KPI alert check
    if (client.kpis?.some(k => k.target && k.current < k.target * 0.6)) {
      await Notification.create({
        type: 'kpi_alert',
        title: `KPI alert — ${client.company} target at risk`,
        body: 'One or more KPIs are below 60% of target. Review needed.',
        relatedClient: client._id,
      });
    }

    res.json({ success: true, client });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/clients/:id/kpis
exports.updateKPIs = async (req, res) => {
  try {
    const { kpis } = req.body;
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { kpis, updatedAt: new Date() },
      { new: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, client });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
