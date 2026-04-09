const Diagnostic  = require('../models/Diagnostic');
const Lead        = require('../models/Lead');
const Newsletter  = require('../models/Newsletter');

// ── Build date filter from query param ──────────────────────────────────────
function buildDateFilter(days) {
  if (!days) return null;
  const n = parseInt(days);
  if (!n) return null;
  return { $gte: new Date(Date.now() - n * 24 * 60 * 60 * 1000) };
}

// ── Region → countries map ───────────────────────────────────────────────────
const REGION_COUNTRIES = {
  'West Africa':     ['Nigeria','Ghana','Senegal',"Côte d'Ivoire",'Mali','Burkina Faso','Togo','Benin','Guinea','Sierra Leone','Liberia','Gambia','Guinea-Bissau','Cabo Verde','Niger'],
  'East Africa':     ['Kenya','Tanzania','Uganda','Rwanda','Ethiopia','Somalia','Djibouti','Eritrea','South Sudan','Burundi'],
  'Southern Africa': ['South Africa','Zimbabwe','Zambia','Mozambique','Botswana','Namibia','Malawi','Lesotho','Eswatini','Madagascar','Angola'],
  'North Africa':    ['Morocco','Egypt','Tunisia','Algeria','Libya','Sudan','Mauritania'],
  'Central Africa':  ['Congo (DRC)','Congo (Brazzaville)','Cameroon','Central African Republic','Chad','Gabon','Equatorial Guinea','São Tomé & Príncipe'],
};

// ── GET /api/insights/analytics  (protected) ────────────────────────────────
// Query params: days, region, industry, size, scoreBand
exports.getAnalytics = async (req, res) => {
  try {
    const { days, region, industry, size, scoreBand } = req.query;

    // Base match filters
    const baseMatch = {};
    const dateFilter = buildDateFilter(days);
    if (dateFilter) baseMatch.createdAt = dateFilter;
    if (region && REGION_COUNTRIES[region]) baseMatch.country = { $in: REGION_COUNTRIES[region] };
    if (industry) baseMatch.industry = industry;
    if (size)     baseMatch.employees = size;
    if (scoreBand) {
      const bands = { critical:[0,24], developing:[25,49], progressing:[50,74], strong:[75,100] };
      const b = bands[scoreBand];
      if (b) baseMatch.overallScore = { $gte: b[0], $lte: b[1] };
    }

    const completedMatch = { ...baseMatch, status: 'completed' };

    const [
      totalDiags,
      completedDiags,
      countryDist,
      industryDist,
      sizeDist,
      revenueDist,
      scoreStats,
      scoreDist,
      dimensionAvgs,
      monthlyTrend,
      leadTypeTotal,
      leadTypeDist,
      newsletterCount,
      newsletterActive,
      languageDist,
      challengeKeywords,
      sourceBreakdown,
      conversionRate,
    ] = await Promise.all([

      Diagnostic.countDocuments(baseMatch),
      Diagnostic.countDocuments(completedMatch),

      // Country breakdown (top 20)
      Diagnostic.aggregate([
        { $match: { ...baseMatch, country: { $exists: true, $ne: '' } } },
        { $group: { _id: '$country', count: { $sum: 1 }, avgScore: { $avg: '$overallScore' } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),

      // Industry breakdown
      Diagnostic.aggregate([
        { $match: { ...baseMatch, industry: { $exists: true, $ne: '' } } },
        { $group: {
          _id: '$industry',
          count: { $sum: 1 },
          avgScore: { $avg: '$overallScore' },
          completed: { $sum: { $cond: [{ $eq: ['$status','completed'] }, 1, 0] } },
        }},
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Company size
      Diagnostic.aggregate([
        { $match: { ...baseMatch, employees: { $exists: true, $ne: '' } } },
        { $group: { _id: '$employees', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Revenue distribution
      Diagnostic.aggregate([
        { $match: { ...baseMatch, revenue: { $exists: true, $ne: '' } } },
        { $group: { _id: '$revenue', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Score stats
      Diagnostic.aggregate([
        { $match: { ...completedMatch, overallScore: { $exists: true } } },
        { $group: {
          _id: null,
          avgScore:    { $avg: '$overallScore' },
          minScore:    { $min: '$overallScore' },
          maxScore:    { $max: '$overallScore' },
          totalScored: { $sum: 1 },
        }},
      ]),

      // Score distribution bands
      Diagnostic.aggregate([
        { $match: { ...completedMatch, overallScore: { $exists: true } } },
        { $bucket: {
          groupBy: '$overallScore',
          boundaries: [0, 25, 50, 75, 101],
          default: 'other',
          output: { count: { $sum: 1 } },
        }},
      ]),

      // Dimension averages (weakest first)
      Diagnostic.aggregate([
        { $match: { ...completedMatch, dimensions: { $exists: true, $ne: [] } } },
        { $unwind: '$dimensions' },
        { $group: {
          _id: '$dimensions.id',
          title:    { $first: '$dimensions.title' },
          avgScore: { $avg: '$dimensions.score' },
          critical: { $sum: { $cond: [{ $eq: ['$dimensions.severity','Critical'] }, 1, 0] } },
          strong:   { $sum: { $cond: [{ $eq: ['$dimensions.severity','Strong'] }, 1, 0] } },
          count:    { $sum: 1 },
        }},
        { $sort: { avgScore: 1 } },
      ]),

      // Monthly trend (last 12 months)
      Diagnostic.aggregate([
        { $match: {
          ...baseMatch,
          createdAt: { $gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) },
        }},
        { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status','completed'] }, 1, 0] } },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Lead total
      Lead.countDocuments(dateFilter ? { createdAt: dateFilter } : {}),

      // Lead type breakdown
      Lead.aggregate([
        ...(dateFilter ? [{ $match: { createdAt: dateFilter } }] : []),
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Newsletter total
      Newsletter.countDocuments(),

      // Newsletter active
      Newsletter.countDocuments({ isActive: true }),

      // Language split
      Diagnostic.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$language', count: { $sum: 1 } } },
      ]),

      // Top challenge keywords (word frequency)
      Diagnostic.aggregate([
        { $match: { ...baseMatch, challenge: { $exists: true, $ne: '' } } },
        { $project: { words: { $split: [{ $toLower: '$challenge' }, ' '] } } },
        { $unwind: '$words' },
        { $match: { words: { $regex: /^[a-z]{5,}$/, $nin: ['about','their','there','which','would','could','should','where','after','being','other','since','these','those','while','among','every','under','above','below','until','along','often','first','many','much','more','some','than','this','that','have','from','with','into','will'] } } },
        { $group: { _id: '$words', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),

      // Lead source breakdown
      Lead.aggregate([
        ...(dateFilter ? [{ $match: { createdAt: dateFilter } }] : []),
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Conversion rate (won leads / total leads)
      Lead.aggregate([
        ...(dateFilter ? [{ $match: { createdAt: dateFilter } }] : []),
        { $group: {
          _id: null,
          total: { $sum: 1 },
          won:   { $sum: { $cond: [{ $eq: ['$stage','won'] }, 1, 0] } },
          lost:  { $sum: { $cond: [{ $eq: ['$stage','lost'] }, 1, 0] } },
        }},
      ]),
    ]);

    const countryTotal  = countryDist.reduce((s, c) => s + c.count, 0);
    const industryTotal = industryDist.reduce((s, c) => s + c.count, 0);
    const sizeTotal     = sizeDist.reduce((s, c) => s + c.count, 0);
    const conv          = conversionRate[0] || { total: 0, won: 0, lost: 0 };

    res.json({
      success: true,
      filters: { days, region, industry, size, scoreBand },
      data: {
        overview: {
          totalDiagnostics:      totalDiags,
          completedDiagnostics:  completedDiags,
          pendingDiagnostics:    totalDiags - completedDiags,
          avgScore:              scoreStats[0]?.avgScore ? Math.round(scoreStats[0].avgScore) : null,
          minScore:              scoreStats[0]?.minScore ?? null,
          maxScore:              scoreStats[0]?.maxScore ?? null,
          totalCountries:        countryDist.length,
          totalLeads:            leadTypeTotal,
          newsletterTotal:       newsletterCount,
          newsletterActive:      newsletterActive,
          conversionRate:        conv.total ? Math.round((conv.won / conv.total) * 100) : null,
          wonLeads:              conv.won,
          lostLeads:             conv.lost,
        },
        countries: countryDist.map(c => ({
          country:  c._id,
          count:    c.count,
          avgScore: c.avgScore ? Math.round(c.avgScore) : null,
          pct:      countryTotal ? Math.round((c.count / countryTotal) * 100) : 0,
        })),
        industries: industryDist.map(i => ({
          industry:  i._id,
          count:     i.count,
          avgScore:  i.avgScore ? Math.round(i.avgScore) : null,
          completed: i.completed,
          pct:       industryTotal ? Math.round((i.count / industryTotal) * 100) : 0,
        })),
        companySizes: sizeDist.map(s => ({
          size:  s._id,
          count: s.count,
          pct:   sizeTotal ? Math.round((s.count / sizeTotal) * 100) : 0,
        })),
        revenues: revenueDist.map(r => ({
          band:  r._id,
          count: r.count,
        })),
        scoreDistribution: [
          { band: '0–24',   label: 'Critical',    count: 0 },
          { band: '25–49',  label: 'Developing',  count: 0 },
          { band: '50–74',  label: 'Progressing', count: 0 },
          { band: '75–100', label: 'Strong',       count: 0 },
        ].map((def, i) => {
          const boundaries = [0, 25, 50, 75];
          const found = scoreDist.find(b => b._id === boundaries[i]);
          return { ...def, count: found?.count || 0 };
        }),
        dimensions: dimensionAvgs.map(d => ({
          id:       d._id,
          title:    d.title,
          avgScore: Math.round(d.avgScore),
          critical: d.critical,
          strong:   d.strong,
          count:    d.count,
        })),
        monthlyTrend: monthlyTrend.map(m => ({
          month:     `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
          count:     m.count,
          completed: m.completed,
        })),
        leadTypes:   leadTypeDist.map(l => ({ type: l._id || 'unknown', count: l.count })),
        leadSources: sourceBreakdown.map(s => ({ source: s._id || 'website', count: s.count })),
        languages:   languageDist.map(l => ({ lang: l._id, count: l.count })),
        challengeKeywords: challengeKeywords.map(k => ({ word: k._id, count: k.count })),
      },
    });
  } catch (err) {
    console.error('Insights analytics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/insights/diagnostics  (protected, server-side filter/sort/page) ─
exports.getDiagnostics = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      days, region, industry, size, scoreBand, search,
      sort = 'createdAt', dir = 'desc',
    } = req.query;

    const filter = {};

    const dateFilter = buildDateFilter(days);
    if (dateFilter) filter.createdAt = dateFilter;
    if (region && REGION_COUNTRIES[region]) filter.country = { $in: REGION_COUNTRIES[region] };
    if (industry) filter.industry = industry;
    if (size)     filter.employees = size;

    if (scoreBand) {
      const bands = { critical:[0,24], developing:[25,49], progressing:[50,74], strong:[75,100] };
      const b = bands[scoreBand];
      if (b) filter.overallScore = { $gte: b[0], $lte: b[1] };
    }

    if (search) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ company: re }, { country: re }, { industry: re }, { name: re }];
    }

    const allowedSort = ['createdAt','overallScore','company','country','industry','employees','revenue','status'];
    const sortField = allowedSort.includes(sort) ? sort : 'createdAt';
    const sortDir   = dir === 'asc' ? 1 : -1;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Diagnostic.countDocuments(filter);

    const diagnostics = await Diagnostic.find(filter)
      .select('company name email country industry employees revenue overallScore scoreLabel status language createdAt lead')
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      total,
      page:     parseInt(page),
      pages:    Math.ceil(total / parseInt(limit)),
      limit:    parseInt(limit),
      diagnostics,
    });
  } catch (err) {
    console.error('Insights diagnostics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/insights/demand  (protected) ────────────────────────────────────
// Detailed demand signal: what businesses want, service interest, plan requests
exports.getDemand = async (req, res) => {
  try {
    const { days } = req.query;
    const dateFilter = buildDateFilter(days);
    const match = dateFilter ? { createdAt: dateFilter } : {};

    const [
      leadsByType,
      leadsByStage,
      leadsByService,
      leadsByPlan,
      leadsByCountry,
      leadsBySource,
      diagsByIndustry,
      recentLeads,
    ] = await Promise.all([
      Lead.aggregate([
        ...(dateFilter ? [{ $match: match }] : []),
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        ...(dateFilter ? [{ $match: match }] : []),
        { $group: { _id: '$stage', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: { ...match, service: { $exists: true, $ne: '' } } },
        { $group: { _id: '$service', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Lead.aggregate([
        { $match: { ...match, plan: { $exists: true, $ne: '' } } },
        { $group: { _id: '$plan', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: { ...match, country: { $exists: true, $ne: '' } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      Lead.aggregate([
        ...(dateFilter ? [{ $match: match }] : []),
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Diagnostic.aggregate([
        { $match: { ...match, industry: { $exists: true, $ne: '' } } },
        { $group: { _id: '$industry', count: { $sum: 1 }, avgScore: { $avg: '$overallScore' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Lead.find(match)
        .select('name email company country type stage createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        leadsByType:     leadsByType.map(l  => ({ type:    l._id, count: l.count })),
        leadsByStage:    leadsByStage.map(l  => ({ stage:   l._id, count: l.count })),
        leadsByService:  leadsByService.map(l => ({ service: l._id, count: l.count })),
        leadsByPlan:     leadsByPlan.map(l   => ({ plan:    l._id, count: l.count })),
        leadsByCountry:  leadsByCountry.map(l => ({ country: l._id, count: l.count })),
        leadsBySource:   leadsBySource.map(l  => ({ source:  l._id, count: l.count })),
        diagsByIndustry: diagsByIndustry.map(d => ({
          industry: d._id,
          count:    d.count,
          avgScore: d.avgScore ? Math.round(d.avgScore) : null,
        })),
        recentLeads,
      },
    });
  } catch (err) {
    console.error('Insights demand error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/insights/export  (protected) ────────────────────────────────────
// Returns CSV of filtered diagnostics
exports.exportCSV = async (req, res) => {
  try {
    const { days, region, industry, size, scoreBand, search } = req.query;

    const filter = {};
    const dateFilter = buildDateFilter(days);
    if (dateFilter) filter.createdAt = dateFilter;
    if (region && REGION_COUNTRIES[region]) filter.country = { $in: REGION_COUNTRIES[region] };
    if (industry) filter.industry = industry;
    if (size)     filter.employees = size;
    if (scoreBand) {
      const bands = { critical:[0,24], developing:[25,49], progressing:[50,74], strong:[75,100] };
      const b = bands[scoreBand];
      if (b) filter.overallScore = { $gte: b[0], $lte: b[1] };
    }
    if (search) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ company: re }, { country: re }, { industry: re }, { name: re }];
    }

    const rows = await Diagnostic.find(filter)
      .select('company name email country industry employees revenue overallScore scoreLabel status language createdAt')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Company','Contact Name','Email','Country','Industry','Employees','Revenue','Score','Score Label','Status','Language','Submitted'];
    const lines   = [
      headers.join(','),
      ...rows.map(r => [
        r.company, r.name, r.email, r.country, r.industry,
        r.employees, r.revenue, r.overallScore ?? '', r.scoreLabel,
        r.status, r.language,
        new Date(r.createdAt).toISOString().slice(0, 10),
      ].map(escape).join(',')),
    ];

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vertex-insights-${date}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) {
    console.error('Insights export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
