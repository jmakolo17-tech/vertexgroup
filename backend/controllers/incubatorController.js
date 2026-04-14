const Entrepreneur = require('../models/Entrepreneur');
const XLSX = require('xlsx');

// ── GET /api/incubators/entrepreneurs ─────────────────────────────────────────
exports.getEntrepreneurs = async (req, res) => {
  try {
    const { search, country, sector, incubator, stage, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (country)           filter.country = new RegExp(country, 'i');
    if (sector)            filter.sector  = new RegExp(sector, 'i');
    if (req.query.source)  filter.source  = new RegExp(req.query.source, 'i');
    if (incubator)         filter['programmes.incubator'] = new RegExp(incubator, 'i');
    if (stage)     filter['programmes.stage']     = stage;
    if (search) {
      filter.$or = [
        { name:        new RegExp(search, 'i') },
        { email:       new RegExp(search, 'i') },
        { companyName: new RegExp(search, 'i') },
      ];
    }
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Entrepreneur.countDocuments(filter);
    const entrepreneurs = await Entrepreneur.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({ success: true, total, entrepreneurs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/incubators/analytics ─────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const all = await Entrepreneur.find({});

    const totalEntrepreneurs = all.length;
    const totalFunding = all.reduce((s, e) => s + (e.totalFunding || 0), 0);

    // Active in a programme right now
    const activeNow = all.filter(e =>
      e.programmes.some(p => p.stage === 'active')
    ).length;

    // Duplicates: entrepreneurs in 2+ incubators simultaneously (both active)
    const duplicates = all.filter(e => {
      const activeProgs = e.programmes.filter(p => p.stage === 'active');
      const incubators  = [...new Set(activeProgs.map(p => p.incubator).filter(Boolean))];
      return incubators.length >= 2;
    });

    // By country
    const byCountry = {};
    all.forEach(e => { if (e.country) byCountry[e.country] = (byCountry[e.country] || 0) + 1; });

    // By sector
    const bySector = {};
    all.forEach(e => { if (e.sector) bySector[e.sector] = (bySector[e.sector] || 0) + 1; });

    // By incubator
    const byIncubator = {};
    all.forEach(e => e.programmes.forEach(p => {
      if (p.incubator) byIncubator[p.incubator] = (byIncubator[p.incubator] || 0) + 1;
    }));

    // Funded entrepreneurs
    const funded = all.filter(e => e.funding && e.funding.length > 0).length;

    // Funding by type
    const byFundingType = {};
    all.forEach(e => e.funding.forEach(f => {
      if (f.type) byFundingType[f.type] = (byFundingType[f.type] || 0) + (f.amount || 0);
    }));

    // By gender
    const byGender = {};
    all.forEach(e => { const g = e.gender || 'Unknown'; byGender[g] = (byGender[g] || 0) + 1; });

    res.json({
      success: true,
      kpis: { totalEntrepreneurs, totalFunding, activeNow, funded, duplicates: duplicates.length },
      byCountry:     Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).slice(0,15),
      bySector:      Object.entries(bySector).sort((a,b)=>b[1]-a[1]).slice(0,15),
      byIncubator:   Object.entries(byIncubator).sort((a,b)=>b[1]-a[1]),
      byFundingType: Object.entries(byFundingType).sort((a,b)=>b[1]-a[1]),
      byGender:      Object.entries(byGender),
      duplicateList: duplicates.map(e => ({
        _id: e._id, name: e.name, email: e.email, companyName: e.companyName,
        programmes: e.programmes.filter(p => p.stage === 'active'),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/incubators/duplicates ────────────────────────────────────────────
exports.getDuplicates = async (req, res) => {
  try {
    const all = await Entrepreneur.find({ 'programmes.1': { $exists: true } });
    const duplicates = all.filter(e => {
      const activeProgs = e.programmes.filter(p => p.stage === 'active');
      return [...new Set(activeProgs.map(p => p.incubator).filter(Boolean))].length >= 2;
    });
    res.json({ success: true, duplicates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/incubators/entrepreneurs (manual add) ───────────────────────────
exports.addEntrepreneur = async (req, res) => {
  try {
    const { name, email, phone, country, city, sector, companyName, gender, programmes, funding, source, tags } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });

    // Upsert by email if provided
    let entrepreneur;
    if (email) {
      entrepreneur = await Entrepreneur.findOne({ email });
      if (entrepreneur) {
        // Merge programmes
        if (programmes?.length) entrepreneur.programmes.push(...programmes);
        if (funding?.length)    entrepreneur.funding.push(...funding);
        entrepreneur.totalFunding = entrepreneur.funding.reduce((s, f) => s + (f.amount || 0), 0);
        await entrepreneur.save();
        return res.json({ success: true, entrepreneur, merged: true });
      }
    }

    const calcFunding = (funding || []).reduce((s, f) => s + (f.amount || 0), 0);
    entrepreneur = await Entrepreneur.create({
      name, email, phone, country, city, sector, companyName, gender,
      programmes: programmes || [], funding: funding || [],
      totalFunding: calcFunding, source, tags: tags || [],
      addedBy: req.user._id,
    });
    res.status(201).json({ success: true, entrepreneur });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/incubators/entrepreneurs/:id ───────────────────────────────────
exports.updateEntrepreneur = async (req, res) => {
  try {
    if (req.body.funding) {
      req.body.totalFunding = (req.body.funding || []).reduce((s, f) => s + (f.amount || 0), 0);
    }
    const e = await Entrepreneur.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!e) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, entrepreneur: e });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/incubators/entrepreneurs/:id ──────────────────────────────────
exports.deleteEntrepreneur = async (req, res) => {
  try {
    await Entrepreneur.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/incubators/upload (Excel import) ────────────────────────────────
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

    if (!rows.length) return res.status(400).json({ success: false, message: 'Sheet is empty.' });

    // Normalise column names (case-insensitive)
    const norm = (row) => {
      const out = {};
      Object.keys(row).forEach(k => { out[k.toLowerCase().replace(/\s+/g,'_')] = row[k]; });
      return out;
    };

    const results = { created: 0, merged: 0, errors: [] };
    const incubatorSource = req.body.incubatorName || 'Imported';

    for (const rawRow of rows) {
      try {
        const row = norm(rawRow);
        const name = String(row.name || row.entrepreneur_name || row.full_name || '').trim();
        if (!name) continue;

        const email       = String(row.email || '').trim().toLowerCase() || undefined;
        const phone       = String(row.phone || row.phone_number || '').trim();
        const country     = String(row.country || '').trim();
        const city        = String(row.city || '').trim();
        const sector      = String(row.sector || row.industry || '').trim();
        const companyName = String(row.company || row.company_name || row.startup || '').trim();
        const gender      = String(row.gender || '').trim();

        // Programme info
        const progName    = String(row.programme || row.program || row.programme_name || '').trim();
        const stage       = String(row.stage || row.status || 'active').trim().toLowerCase();
        const validStages = ['applied','active','graduated','dropped'];
        const progStage   = validStages.includes(stage) ? stage : 'active';
        const startDate   = row.start_date || row.start || undefined;
        const endDate     = row.end_date   || row.end   || undefined;

        // Funding info
        const fundingAmt  = parseFloat(row.funding || row.amount_raised || row.funding_raised || 0) || 0;
        const investor    = String(row.investor || row.funder || '').trim();
        const fundingType = String(row.funding_type || row.type_of_funding || '').trim();

        const progEntry = progName ? [{
          programmeName: progName,
          incubator:     incubatorSource,
          stage:         progStage,
          startDate:     startDate ? new Date(startDate) : undefined,
          endDate:       endDate   ? new Date(endDate)   : undefined,
          sector,
        }] : [];

        const fundEntry = fundingAmt > 0 ? [{
          amount:   fundingAmt,
          currency: String(row.currency || 'USD').trim(),
          investor,
          type:     fundingType,
          date:     row.funding_date ? new Date(row.funding_date) : undefined,
        }] : [];

        // Try to find existing by email
        let existing = email ? await Entrepreneur.findOne({ email }) : null;
        if (!existing && name) {
          existing = await Entrepreneur.findOne({ name: new RegExp(`^${name}$`, 'i') });
        }

        if (existing) {
          if (progEntry.length) existing.programmes.push(...progEntry);
          if (fundEntry.length) existing.funding.push(...fundEntry);
          existing.totalFunding = existing.funding.reduce((s, f) => s + (f.amount || 0), 0);
          if (!existing.country && country) existing.country = country;
          if (!existing.sector  && sector)  existing.sector  = sector;
          await existing.save();
          results.merged++;
        } else {
          await Entrepreneur.create({
            name, email, phone, country, city, sector, companyName, gender,
            programmes: progEntry, funding: fundEntry,
            totalFunding: fundEntry.reduce((s, f) => s + (f.amount || 0), 0),
            source: incubatorSource, addedBy: req.user._id,
          });
          results.created++;
        }
      } catch(rowErr) {
        results.errors.push(String(rowErr.message));
      }
    }

    res.json({ success: true, results, total: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/incubators/export ────────────────────────────────────────────────
exports.exportXLSX = async (req, res) => {
  try {
    const all = await Entrepreneur.find({}).lean();
    const rows = all.map(e => ({
      Name:             e.name,
      Email:            e.email || '',
      Phone:            e.phone || '',
      Company:          e.companyName || '',
      Country:          e.country || '',
      Sector:           e.sector || '',
      Gender:           e.gender || '',
      Source:           e.source || '',
      'Active Programmes': e.programmes.filter(p=>p.stage==='active').map(p=>p.programmeName).join('; '),
      'All Programmes': e.programmes.map(p=>`${p.programmeName||'?'} @ ${p.incubator||'?'} [${p.stage}]`).join('; '),
      'Total Funding':  e.totalFunding || 0,
      'Funding Details':e.funding.map(f=>`${f.investor||'?'}: ${f.currency||'USD'} ${f.amount||0}`).join('; '),
      'Enrolled Date':  e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entrepreneurs');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="incubators-export.xlsx"');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
