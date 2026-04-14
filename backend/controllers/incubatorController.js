const Entrepreneur = require('../models/Entrepreneur');
const XLSX = require('xlsx');

// ── helpers ───────────────────────────────────────────────────────────────────
const norm = row => {
  const out = {};
  Object.keys(row).forEach(k => {
    out[k.toLowerCase().trim().replace(/[\s\-\/]+/g, '_')] = row[k];
  });
  return out;
};
const str = v => String(v || '').trim();
const num = v => parseFloat(str(v).replace(/[,$\s]/g,'')) || 0;
const int = v => parseInt(str(v).replace(/[,$\s]/g,''))  || 0;

const validStages    = ['applied','active','graduated','dropped'];
const validBizStages = ['idea','early','growth','scale','mature'];

function rowToFields(row) {
  const r = norm(row);

  // Name: support separate surname/firstname columns or a combined name column
  const firstName  = str(r.first_name||r.firstname||r.given_name||r.forename||r.prenom||'');
  const surname    = str(r.surname||r.last_name||r.lastname||r.family_name||r.nom||'');
  const fullName   = str(r.name||r.full_name||r.entrepreneur_name||r.participant||'');
  // Build the canonical name
  const name = (firstName && surname) ? `${firstName} ${surname}`
             : (firstName || surname) ? (firstName || surname)
             : fullName;

  const age         = int(r.age||r.current_age||r.years||0)||undefined;
  const email       = str(r.email||r.e_mail||r.email_address||'').toLowerCase()||undefined;
  const phone       = str(r.phone||r.telephone||r.mobile||r.cell||r.contact_number||'');
  const country     = str(r.country||r.nation||'');
  const city        = str(r.city||r.town||r.location||'');
  const sector      = str(r.sector||r.industry||r.field||'');
  const companyName = str(r.company||r.company_name||r.startup||r.business||r.organization||r.venture||'');
  const website     = str(r.website||r.website_url||r.url||'');
  const gender      = str(r.gender||r.sex||'');
  const rawBizStage = str(r.business_stage||r.biz_stage||r.stage_of_business||'').toLowerCase();
  const businessStage = validBizStages.includes(rawBizStage) ? rawBizStage : '';
  const yearFounded   = int(r.year_founded||r.founded||r.founded_year||0)||undefined;
  const employees     = int(r.employees||r.employee_count||r.team_size||r.headcount||r.staff||0)||undefined;
  const revenue       = num(r.revenue||r.annual_revenue||r.yearly_revenue||0)||undefined;
  const turnover      = num(r.turnover||r.annual_turnover||r.sales||r.gross_sales||0)||undefined;
  const progName      = str(r.programme||r.program||r.programme_name||r.program_name||r.cohort||'');
  const rawStage      = str(r.stage||r.status||'active').toLowerCase();
  const progStage     = validStages.includes(rawStage) ? rawStage : 'active';
  const startDate     = r.start_date||r.start||undefined;
  const endDate       = r.end_date||r.end||undefined;
  const fundingAmt    = num(r.funding||r.amount_raised||r.funding_raised||r.amount||0);
  const investor      = str(r.investor||r.funder||r.investor_name||'');
  const fundingType   = str(r.funding_type||r.type_of_funding||r.fund_type||'');
  const currency      = str(r.currency||'USD');
  return { firstName, surname, name, age, email, phone, country, city, sector,
           companyName, website, gender, businessStage, yearFounded, employees,
           revenue, turnover, progName, progStage, startDate, endDate,
           fundingAmt, investor, fundingType, currency };
}

// ── PDF text → rows ───────────────────────────────────────────────────────────
function parsePdfText(text) {
  const splitCells = line => line.split(/\t|\s{2,}/).map(s => s.trim()).filter(Boolean);
  const KEYWORDS = ['name','email','phone','country','sector','company','gender','stage',
                    'programme','program','funding','revenue','turnover','employees','city',
                    'investor','cohort','startup','industry','turnover','headcount'];

  const lines = text.split('\n').map(l => l.replace(/\r/g,'')).filter(l => l.trim());
  let headerIdx = -1, maxScore = 0;

  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const cells = splitCells(lines[i]);
    let score = 0;
    cells.forEach(c => { if (KEYWORDS.some(k => c.toLowerCase().includes(k))) score++; });
    if (score > maxScore) { maxScore = score; headerIdx = i; }
  }
  if (headerIdx === -1 || maxScore < 2) return [];

  const headers = splitCells(lines[headerIdx]).map(h => h.toLowerCase().replace(/\s+/g,'_'));
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCells(lines[i]);
    if (cells.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => { if (cells[idx] !== undefined) row[h] = cells[idx]; });
    rows.push(row);
  }
  return rows;
}

// ── GET /api/incubators/entrepreneurs ─────────────────────────────────────────
exports.getEntrepreneurs = async (req, res) => {
  try {
    const { search, country, sector, incubator, stage, bizStage,
            source, year, donor, sortBy = 'createdAt', sortDir = 'desc',
            page = 1, limit = 50 } = req.query;
    const filter = {};
    if (country)   filter.country                  = new RegExp(country, 'i');
    if (sector)    filter.sector                   = new RegExp(sector, 'i');
    if (source)    filter.source                   = new RegExp(source, 'i');
    if (bizStage)  filter.businessStage            = bizStage;
    if (incubator) filter['programmes.incubator']  = new RegExp(incubator, 'i');
    if (stage)     filter['programmes.stage']      = stage;
    if (year)      filter['programmes.year']       = parseInt(year);
    if (donor)     filter['programmes.donor']      = new RegExp(donor, 'i');
    if (search) {
      filter.$or = [
        { name:        new RegExp(search, 'i') },
        { email:       new RegExp(search, 'i') },
        { companyName: new RegExp(search, 'i') },
        { country:     new RegExp(search, 'i') },
      ];
    }
    const allowedSort = ['name','surname','firstName','country','city','sector','age','revenue','turnover','employees','totalFunding','createdAt'];
    const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = sortDir === 'asc' ? 1 : -1;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Entrepreneur.countDocuments(filter);
    const entrepreneurs = await Entrepreneur.find(filter)
      .sort({ [sortField]: sortOrder }).skip(skip).limit(parseInt(limit));
    res.json({ success: true, total, page: parseInt(page),
               pages: Math.ceil(total / parseInt(limit)), entrepreneurs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/incubators/analytics ─────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const { incubator } = req.query;
    const baseFilter = incubator ? { 'programmes.incubator': new RegExp(incubator,'i') } : {};
    const all = await Entrepreneur.find(baseFilter).lean();

    const totalEntrepreneurs = all.length;
    const totalFunding    = all.reduce((s,e)=>s+(e.totalFunding||0),0);
    const totalRevenue    = all.reduce((s,e)=>s+(e.revenue||0),0);
    const totalTurnover   = all.reduce((s,e)=>s+(e.turnover||0),0);
    const totalEmployees  = all.reduce((s,e)=>s+(e.employees||0),0);
    const fundedCount     = all.filter(e=>e.funding?.length>0).length;
    const revenueCount    = all.filter(e=>e.revenue>0).length;
    const activeNow       = all.filter(e=>e.programmes.some(p=>p.stage==='active')).length;

    const duplicates = all.filter(e => {
      const ap = e.programmes.filter(p=>p.stage==='active');
      return [...new Set(ap.map(p=>p.incubator).filter(Boolean))].length >= 2;
    });

    const agg = field => {
      const m = {};
      all.forEach(e => { const v = e[field]; if (v) m[v]=(m[v]||0)+1; });
      return Object.entries(m).sort((a,b)=>b[1]-a[1]);
    };

    const byIncubator = {}, byYear = {}, byDonor = {};
    all.forEach(e => e.programmes.forEach(p => {
      if (p.incubator) byIncubator[p.incubator]=(byIncubator[p.incubator]||0)+1;
      if (p.year)      byYear[p.year]           =(byYear[p.year]          ||0)+1;
      if (p.donor)     byDonor[p.donor]         =(byDonor[p.donor]        ||0)+1;
    }));

    // Cohorts: unique incubator+programme+year combinations
    const cohortMap = {};
    all.forEach(e => e.programmes.forEach(p => {
      const key = [p.incubator||'?', p.programmeName||'?', p.year||'—', p.donor||'—'].join('||');
      if (!cohortMap[key]) cohortMap[key] = { incubator:p.incubator, programmeName:p.programmeName, year:p.year, donor:p.donor, count:0 };
      cohortMap[key].count++;
    }));

    const byFundingType = {};
    all.forEach(e => (e.funding||[]).forEach(f => {
      if (f.type) byFundingType[f.type]=(byFundingType[f.type]||0)+(f.amount||0);
    }));

    const revByCountry = {}, revBySector = {};
    all.forEach(e => {
      if (e.country && e.revenue) revByCountry[e.country]=(revByCountry[e.country]||0)+(e.revenue||0);
      if (e.sector  && e.revenue) revBySector[e.sector]  =(revBySector[e.sector]  ||0)+(e.revenue||0);
    });

    const empBuckets = {'1-5':0,'6-20':0,'21-50':0,'51-200':0,'200+':0};
    all.forEach(e => {
      const n=e.employees||0; if (!n) return;
      if (n<=5) empBuckets['1-5']++;
      else if (n<=20) empBuckets['6-20']++;
      else if (n<=50) empBuckets['21-50']++;
      else if (n<=200) empBuckets['51-200']++;
      else empBuckets['200+']++;
    });

    const revBuckets = {'No revenue':0,'<$10K':0,'$10K–$100K':0,'$100K–$500K':0,'$500K–$1M':0,'$1M+':0};
    all.forEach(e => {
      const r=e.revenue||0;
      if (!r) revBuckets['No revenue']++;
      else if (r<10000)   revBuckets['<$10K']++;
      else if (r<100000)  revBuckets['$10K–$100K']++;
      else if (r<500000)  revBuckets['$100K–$500K']++;
      else if (r<1000000) revBuckets['$500K–$1M']++;
      else revBuckets['$1M+']++;
    });

    const byCity = {};
    all.forEach(e => { if (e.city) byCity[e.city]=(byCity[e.city]||0)+1; });

    res.json({
      success: true,
      kpis: { totalEntrepreneurs, totalFunding, totalRevenue, totalTurnover,
              totalEmployees, activeNow, funded: fundedCount, revenueCount,
              duplicates: duplicates.length,
              avgRevenue: revenueCount ? Math.round(totalRevenue/revenueCount) : 0 },
      byCountry:    agg('country').slice(0,15),
      bySector:     agg('sector').slice(0,15),
      byIncubator:  Object.entries(byIncubator).sort((a,b)=>b[1]-a[1]),
      byYear:       Object.entries(byYear).sort((a,b)=>b[0]-a[0]),
      byDonor:      Object.entries(byDonor).sort((a,b)=>b[1]-a[1]).slice(0,15),
      cohorts:      Object.values(cohortMap).sort((a,b)=>b.count-a.count),
      byFundingType:Object.entries(byFundingType).sort((a,b)=>b[1]-a[1]),
      byGender:     agg('gender'),
      byBizStage:   agg('businessStage'),
      bySource:     agg('source').slice(0,15),
      revByCountry: Object.entries(revByCountry).sort((a,b)=>b[1]-a[1]).slice(0,15),
      revBySector:  Object.entries(revBySector).sort((a,b)=>b[1]-a[1]).slice(0,15),
      empBuckets:   Object.entries(empBuckets),
      revBuckets:   Object.entries(revBuckets),
      byCity:       Object.entries(byCity).sort((a,b)=>b[1]-a[1]).slice(0,15),
      duplicateList: duplicates.map(e=>({
        _id:e._id,name:e.name,email:e.email,companyName:e.companyName,
        programmes:e.programmes.filter(p=>p.stage==='active'),
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
      const ap = e.programmes.filter(p=>p.stage==='active');
      return [...new Set(ap.map(p=>p.incubator).filter(Boolean))].length >= 2;
    });
    res.json({ success: true, duplicates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/incubators/entrepreneurs ────────────────────────────────────────
exports.addEntrepreneur = async (req, res) => {
  try {
    const { firstName, surname, name, age, email, phone, country, city, sector,
            companyName, website, gender, businessStage, yearFounded, employees,
            revenue, turnover, programmes, funding, source, tags } = req.body;

    const fullName = (firstName && surname) ? `${firstName} ${surname}`.trim()
                   : (name||'').trim();
    if (!fullName) return res.status(400).json({ success: false, message: 'Name is required.' });

    let entrepreneur;
    if (email) {
      entrepreneur = await Entrepreneur.findOne({ email });
      if (entrepreneur) {
        if (programmes?.length) entrepreneur.programmes.push(...programmes);
        if (funding?.length)    entrepreneur.funding.push(...funding);
        entrepreneur.totalFunding = entrepreneur.funding.reduce((s,f)=>s+(f.amount||0),0);
        await entrepreneur.save();
        return res.json({ success: true, entrepreneur, merged: true });
      }
    }
    const calcFunding = (funding||[]).reduce((s,f)=>s+(f.amount||0),0);
    entrepreneur = await Entrepreneur.create({
      firstName, surname, name: fullName, age,
      email, phone, country, city, sector, companyName, website,
      gender, businessStage, yearFounded, employees, revenue, turnover,
      programmes: programmes||[], funding: funding||[],
      totalFunding: calcFunding, source, tags: tags||[], addedBy: req.user._id,
    });
    res.status(201).json({ success: true, entrepreneur });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/incubators/entrepreneurs/:id ───────────────────────────────────
exports.updateEntrepreneur = async (req, res) => {
  try {
    if (req.body.funding)
      req.body.totalFunding = (req.body.funding||[]).reduce((s,f)=>s+(f.amount||0),0);
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

// ── POST /api/incubators/upload ───────────────────────────────────────────────
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const ext  = (req.file.originalname.split('.').pop()||'').toLowerCase();
    const mime = req.file.mimetype || '';
    const incubatorSource = req.body.incubatorName  || 'Imported';
    const programmeName   = req.body.programmeName  || '';
    const cohortYear      = parseInt(req.body.year) || undefined;
    const donor           = req.body.donor          || '';
    let rows = [];

    if (ext === 'pdf' || mime === 'application/pdf') {
      let pdfParse;
      try { pdfParse = require('pdf-parse'); }
      catch(e) { return res.status(500).json({ success: false, message: 'PDF support not available on server — install pdf-parse.' }); }
      const data = await pdfParse(req.file.buffer);
      rows = parsePdfText(data.text);
      if (!rows.length)
        return res.status(400).json({ success: false,
          message: 'Could not find a data table in this PDF. Ensure it has a header row with column names like "Name", "Email", "Country", "Sector", etc.' });
    } else {
      // SheetJS handles xlsx, xls, csv, ods, numbers, tsv, dbf, etc.
      const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      if (!rows.length) return res.status(400).json({ success: false, message: 'File is empty or unreadable.' });
    }

    const results = { created: 0, merged: 0, errors: [] };

    for (const rawRow of rows) {
      try {
        const f = rowToFields(rawRow);
        if (!f.name) continue;

        const progEntry = (f.progName || programmeName || incubatorSource) ? [{
          programmeName: f.progName || programmeName,
          incubator:     incubatorSource,
          year:          cohortYear,
          donor:         donor || undefined,
          stage:         f.progStage,
          startDate:     f.startDate ? new Date(f.startDate) : undefined,
          endDate:       f.endDate   ? new Date(f.endDate)   : undefined,
          sector:        f.sector,
        }] : [];

        const fundEntry = f.fundingAmt > 0 ? [{
          amount: f.fundingAmt, currency: f.currency,
          investor: f.investor, type: f.fundingType,
        }] : [];

        let existing = f.email ? await Entrepreneur.findOne({ email: f.email }) : null;
        if (!existing && f.name)
          existing = await Entrepreneur.findOne({ name: new RegExp(`^${f.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i') });

        if (existing) {
          if (progEntry.length) existing.programmes.push(...progEntry);
          if (fundEntry.length) existing.funding.push(...fundEntry);
          existing.totalFunding = existing.funding.reduce((s,fu)=>s+(fu.amount||0),0);
          ['firstName','surname','age','country','city','sector','revenue','turnover',
           'employees','website','businessStage','companyName'].forEach(k => {
            if (!existing[k] && f[k]) existing[k] = f[k];
          });
          await existing.save();
          results.merged++;
        } else {
          await Entrepreneur.create({
            firstName:f.firstName, surname:f.surname, name:f.name,
            age:f.age, email:f.email, phone:f.phone,
            country:f.country, city:f.city, sector:f.sector,
            companyName:f.companyName, website:f.website,
            gender:f.gender, businessStage:f.businessStage, yearFounded:f.yearFounded,
            employees:f.employees, revenue:f.revenue, turnover:f.turnover,
            programmes:progEntry, funding:fundEntry,
            totalFunding:fundEntry.reduce((s,fu)=>s+(fu.amount||0),0),
            source:incubatorSource, addedBy:req.user._id,
          });
          results.created++;
        }
      } catch(rowErr) { results.errors.push(String(rowErr.message)); }
    }

    res.json({ success: true, results, total: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/incubators/export ────────────────────────────────────────────────
exports.exportXLSX = async (req, res) => {
  try {
    const { incubator } = req.query;
    const filter = incubator ? { 'programmes.incubator': new RegExp(incubator,'i') } : {};
    const all = await Entrepreneur.find(filter).lean();
    const rows = all.flatMap(e => {
      // One row per programme entry; if no programmes, one row with blanks
      const progs = e.programmes?.length ? e.programmes : [{}];
      return progs.map(p => ({
        Surname:          e.surname||'',
        'First Name':     e.firstName||'',
        'Full Name':      e.name||'',
        Age:              e.age||'',
        Email:            e.email||'',
        Phone:            e.phone||'',
        Company:          e.companyName||'',
        City:             e.city||'',
        Country:          e.country||'',
        Sector:           e.sector||'',
        Turnover:         e.turnover||0,
        Revenue:          e.revenue||0,
        Employees:        e.employees||'',
        Gender:           e.gender||'',
        'Business Stage': e.businessStage||'',
        Programme:        p.programmeName||'',
        Incubator:        p.incubator||'',
        Year:             p.year||'',
        Donor:            p.donor||'',
        Stage:            p.stage||'',
        'Total Funding':  e.totalFunding||0,
        'Date Added':     e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '',
      }));
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entrepreneurs');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition','attachment; filename="incubators-export.xlsx"');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
