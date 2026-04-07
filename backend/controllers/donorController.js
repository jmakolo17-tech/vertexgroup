const Donor = require('../models/Donor');

// GET /api/donors
exports.getDonors = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { name:    { $regex: search, $options: 'i' } },
      { acronym: { $regex: search, $options: 'i' } },
    ];

    const donors = await Donor.find(filter)
      .populate('addedBy', 'name initials')
      .sort({ createdAt: -1 });

    const totalCommitted = donors.reduce((sum, d) => sum + (d.totalCommitment || 0), 0);
    const totalSMEs      = donors.reduce((sum, d) => sum + d.smeEngagements.length, 0);

    res.json({ success: true, total: donors.length, totalCommitted, totalSMEs, donors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/donors/:id
exports.getDonor = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id).populate('addedBy', 'name initials');
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    res.json({ success: true, donor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/donors
exports.createDonor = async (req, res) => {
  try {
    const { name, acronym, type, status, totalCommitment, countries, contactPerson, contactEmail, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Donor name is required' });

    const donor = await Donor.create({
      name, acronym, type, status, totalCommitment, countries,
      contactPerson, contactEmail, notes,
      addedBy: req.user._id,
    });
    res.status(201).json({ success: true, donor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/donors/:id
exports.updateDonor = async (req, res) => {
  try {
    const allowed = ['name','acronym','type','status','totalCommitment','countries','contactPerson','contactEmail','notes'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const donor = await Donor.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    res.json({ success: true, donor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/donors/:id
exports.deleteDonor = async (req, res) => {
  try {
    await Donor.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Donor deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/donors/:id/sme  — add SME engagement to a donor
exports.addSME = async (req, res) => {
  try {
    const { smeName, smeCountry, smeSector, amount, objective, kpiLabel, kpiCurrent, kpiTarget, status } = req.body;
    if (!smeName) return res.status(400).json({ success: false, message: 'SME name is required' });

    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });

    donor.smeEngagements.push({ smeName, smeCountry, smeSector, amount, objective, kpiLabel, kpiCurrent, kpiTarget, status });
    // Update totalCommitment to sum of all SME amounts
    donor.totalCommitment = donor.smeEngagements.reduce((s, e) => s + (e.amount || 0), 0);
    await donor.save();

    res.status(201).json({ success: true, donor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/donors/:id/sme/:smeId — update KPI progress
exports.updateSME = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });

    const sme = donor.smeEngagements.id(req.params.smeId);
    if (!sme) return res.status(404).json({ success: false, message: 'SME engagement not found' });

    const allowed = ['smeName','smeCountry','smeSector','amount','objective','kpiLabel','kpiCurrent','kpiTarget','status'];
    allowed.forEach(k => { if (req.body[k] !== undefined) sme[k] = req.body[k]; });

    donor.totalCommitment = donor.smeEngagements.reduce((s, e) => s + (e.amount || 0), 0);
    await donor.save();

    res.json({ success: true, donor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/donors/:id/sme/:smeId
exports.deleteSME = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });

    donor.smeEngagements = donor.smeEngagements.filter(s => s._id.toString() !== req.params.smeId);
    donor.totalCommitment = donor.smeEngagements.reduce((s, e) => s + (e.amount || 0), 0);
    await donor.save();

    res.json({ success: true, donor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
