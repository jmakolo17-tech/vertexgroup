const Corporate = require('../models/Corporate');

// GET /api/corporates
exports.getCorporates = async (req, res) => {
  try {
    const { country, status, search } = req.query;
    const filter = {};
    if (country) filter.country = country;
    if (status)  filter.status  = status;
    if (search)  filter.$or = [
      { name:          { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { sector:        { $regex: search, $options: 'i' } },
    ];

    const corporates = await Corporate.find(filter)
      .populate('addedBy', 'name initials')
      .sort({ createdAt: -1 });

    // Group by country for easy rendering
    const byCountry = {};
    corporates.forEach(c => {
      if (!byCountry[c.country]) byCountry[c.country] = [];
      byCountry[c.country].push(c);
    });

    res.json({ success: true, total: corporates.length, corporates, byCountry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/corporates/:id
exports.getCorporate = async (req, res) => {
  try {
    const corporate = await Corporate.findById(req.params.id).populate('addedBy', 'name initials');
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate not found' });
    res.json({ success: true, corporate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/corporates
exports.createCorporate = async (req, res) => {
  try {
    const { name, country, sector, partnershipType, status, contactPerson, contactEmail, contactPhone, website, notes, commitmentAmount } = req.body;
    if (!name || !country) {
      return res.status(400).json({ success: false, message: 'Name and country are required' });
    }
    const corporate = await Corporate.create({
      name, country, sector, partnershipType, status, contactPerson,
      contactEmail, contactPhone, website, notes, commitmentAmount,
      addedBy: req.user._id,
    });
    res.status(201).json({ success: true, corporate });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/corporates/:id
exports.updateCorporate = async (req, res) => {
  try {
    const allowed = ['name','country','sector','partnershipType','status','contactPerson','contactEmail','contactPhone','website','notes','commitmentAmount'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const corporate = await Corporate.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate not found' });
    res.json({ success: true, corporate });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/corporates/:id
exports.deleteCorporate = async (req, res) => {
  try {
    await Corporate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Corporate deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
