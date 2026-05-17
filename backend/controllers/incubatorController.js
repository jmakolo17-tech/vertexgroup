const Entrepreneur = require('../models/Entrepreneur');
const XLSX = require('xlsx');

// ── helpers ───────────────────────────────────────────────────────────────────
const str = v => String(v || '').trim();
const num = v => parseFloat(str(v).replace(/[^0-9.\-]/g,'')) || 0;
const int = v => parseInt(str(v).replace(/[^0-9\-]/g,''))    || 0;

const normKey = k => String(k)
  .toLowerCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const norm = row => {
  const out = {};
  Object.keys(row).forEach(k => { out[normKey(k)] = row[k]; });
  return out;
};

const pick = (r, ...keys) => {
  for (const k of keys) if (r[k] !== undefined && str(r[k])) return str(r[k]);
  return '';
};

const scan = (r, ...substrings) => {
  for (const sub of substrings) {
    for (const [k, v] of Object.entries(r)) {
      if (k.includes(sub) && str(v)) return str(v);
    }
  }
  return '';
};

const validStages    = ['applied','active','graduated','dropped'];
const validBizStages = ['idea','early','growth','scale','mature'];
const validProgTypes = ['incubation','acceleration','mentorship','training','fellowship','boot_camp','grant','other'];

const normStage = raw => {
  const s = normKey(raw);
  if (['actif','actif_ve','en_cours','en_programme','oui'].includes(s)) return 'active';
  if (['candidat','candidature','postule','postulant','soumis','non','en_attente'].includes(s)) return 'applied';
  if (['diplome','sorti','finaliste','termine','complete','acheve','diplome_e'].includes(s)) return 'graduated';
  if (['abandonne','quitte','retire','exclu','desiste','abandonne_e'].includes(s)) return 'dropped';
  return validStages.includes(raw) ? raw : '';
};

const normBizStage = raw => {
  const s = normKey(raw);
  if (['idee','conception','projet','pre_creation'].includes(s)) return 'idea';
  if (['demarrage','creation','pre_seed','seed','lancement','naissant','debut'].includes(s)) return 'early';
  if (['croissance','developpement','expansion_rapide'].includes(s)) return 'growth';
  if (['expansion','scaling','scale_up','montee_en_puissance'].includes(s)) return 'scale';
  if (['mature','etabli','consolide','maturite'].includes(s)) return 'mature';
  return validBizStages.includes(raw) ? raw : '';
};

const normProgType = raw => {
  const s = normKey(raw);
  if (['incubation','incubateur','incubator'].includes(s)) return 'incubation';
  if (['acceleration','accelerateur','accelerator','accel'].includes(s)) return 'acceleration';
  if (['mentorat','mentorship','mentoring','mentor'].includes(s)) return 'mentorship';
  if (['formation','training','workshop','atelier'].includes(s)) return 'training';
  if (['fellowship','bourse','bursary'].includes(s)) return 'fellowship';
  if (['boot_camp','bootcamp','camp','intensive'].includes(s)) return 'boot_camp';
  if (['grant','subvention','financement','bourse_financiere'].includes(s)) return 'grant';
  if (s) return 'other';
  return '';
};

function rowToFields(row) {
  const r = norm(row);

  const firstName = pick(r,
    'prenom_s','prenom','prenoms','prenom_s_',
    'first_name','firstname','given_name','forename',
  ) || scan(r, 'prenom_s', 'prenom', 'firstname', 'first_name', 'forename', 'given_name');

  const surname = pick(r,
    'nom_s','noms','nom_s_',
    'nom','nom_de_famille','nom_famille',
    'surname','last_name','lastname','family_name',
  ) || scan(r, 'nom_s', 'nom_de_famille', 'surname', 'last_name', 'lastname', 'family_name');

  const fullName = pick(r,
    'name','full_name','fullname','entrepreneur_name',
    'participant','contact',
    'nom_complet','nom_prenom','prenom_nom',
  );

  let name = '';
  if (firstName && surname)      name = `${firstName} ${surname}`;
  else if (firstName || surname) name = firstName || surname;
  else                           name = fullName;

  if (!name) {
    for (const [k, v] of Object.entries(r)) {
      if ((k === 'nom' || k === 'name') && str(v)) { name = str(v); break; }
    }
  }
  if (!name) {
    for (const [k, v] of Object.entries(r)) {
      const s = str(v);
      if (!s || s.length > 80 || /\d{4,}/.test(s) || s.includes('@')) continue;
      if (/^prenom/.test(k)) { name = s; break; }
    }
  }
  if (!name) {
    for (const [k, v] of Object.entries(r)) {
      const s = str(v);
      if (!s || s.length > 80 || /\d{4,}/.test(s) || s.includes('@')) continue;
      if (/^nom/.test(k) && !k.startsWith('nom_de_l') && !k.startsWith('nom_de_e')) { name = s; break; }
    }
  }

  const age = int(pick(r, 'age','current_age','age_actuel','age_actuelle','years')) || undefined;

  const email = (pick(r,
    'adresse_e_mail','adresse_mail','adresse_email',
    'email','e_mail','email_address','mail',
    'courriel','adresse_courriel',
  )).toLowerCase() || undefined;

  const phone = pick(r,
    'numero_whatsapp','whatsapp',
    'phone','telephone','mobile','cell','contact_number',
    'tel','numero_telephone','numero_tel','portable','gsm',
  );

  const country = pick(r, 'country','nation','pays','nationalite');

  const city = pick(r,
    'adresse_de_residence','adresse_de_residence_',
    'city','town','location',
    'ville','localite','commune','cite','adresse',
  );

  const sector = pick(r,
    'dans_quel_secteur_est_elle_active',
    'dans_quel_secteur_exercez_vous',
    'sector','industry','field',
    'secteur','domaine','filiere','branche',
  );

  const companyName = pick(r,
    'nom_de_l_entreprise','nom_de_entreprise',
    'company','company_name','startup','business',
    'organization','organisation','venture',
    'entreprise','societe','nom_entreprise',
    'raison_sociale','nom_societe','enseigne',
  );

  const website = pick(r,
    'site_internet_du_projet_ou_page_sur_un_reseau_social_si_existant',
    'website','website_url','url','web',
    'site_web','site_internet','site','lien',
  );

  const gender = pick(r, 'gender','sex','genre','sexe');

  const rawBizStage = pick(r,
    'business_stage','biz_stage','stage_of_business',
    'stade','stade_developpement','phase','etape','niveau',
  ).toLowerCase();
  const businessStage = normBizStage(rawBizStage);

  const yearFounded = int(pick(r,
    'year_founded','founded','founded_year',
    'annee_creation','annee_fondation','fondee_en','date_creation',
  )) || undefined;

  const empRaw = pick(r,
    'combien_de_personnes_travaillent_dans_l_entreprise_et_quels_sont_leur_role',
    'employees','employee_count','team_size','headcount','staff',
    'employes','effectif','nb_employes','nombre_employes','personnel','salaries',
  );
  const empMatch = String(empRaw).match(/\d+/);
  const employees = empMatch ? parseInt(empMatch[0]) : undefined;

  const revenue = num(pick(r,
    'revenue','annual_revenue','yearly_revenue',
    'revenus','revenu','recettes','produits',
  )) || undefined;

  const monthlyRaw = pick(r, 'en_moyenne_combien_gagnez_vous_par_mois_avec_votre_entreprise');
  const monthly    = num(monthlyRaw);
  const turnoverFromMonthly = monthly > 0 ? monthly * 12 : 0;
  const turnoverFromCol = num(pick(r,
    'turnover','annual_turnover','sales','gross_sales',
    'chiffre_affaires','ca','chiffre_daffaires','ventes','volume_affaires',
  ));
  const turnover = (turnoverFromCol || turnoverFromMonthly) || undefined;

  const description = pick(r,
    'decrivez_votre_entreprise_et_ses_activites_en_10_lignes_maximum_comment_ton_projet_repond_il_aux_besoins_de_ta_communaute',
    'decrivez_votre_entreprise_et_ses_activites_en_10_lignes_maximum',
    'decrivez_votre_entreprise',
    'description','about','bio','summary',
    'description_entreprise','presentation','activites',
  );

  const progName = pick(r,
    'programme','program','programme_name','program_name','cohort',
    'cohorte','nom_programme','intitule_programme',
  );

  const rawProgType = pick(r,
    'programme_type','program_type','type_programme','type_de_programme',
    'type','kind','nature_programme','type_incubation',
  );
  const programmeType = normProgType(rawProgType);

  const selectionne = pick(r, 'selectionne','selectionne_','selectionne_e','selection');
  const rawStage    = pick(r, 'stage','status','statut','etat','etape_programme').toLowerCase();
  let progStage;
  if (selectionne) {
    progStage = /^(oui|o|yes|y|1)$/i.test(selectionne.trim()) ? 'active' : 'applied';
  } else {
    progStage = normStage(rawStage) || 'applied';
  }

  const startDate = r.start_date || r.start || r.date_debut || r.debut || undefined;
  const endDate   = r.end_date   || r.end   || r.date_fin   || r.fin   || undefined;

  const fundingAmt = num(pick(r,
    'funding','amount_raised','funding_raised','amount',
    'financement','montant','montant_leve','capital_leve',
  ));
  const investor = pick(r,
    'investor','funder','investor_name',
    'investisseur','bailleur','donateur','financeur','partenaire_financier',
  );
  const fundingType = pick(r,
    'funding_type','type_of_funding','fund_type',
    'type_financement','type_de_financement','nature_financement',
  );
  const currency = pick(r, 'currency','devise') || 'USD';

  return { firstName, surname, name, age, email, phone, country, city, sector,
           companyName, description, website, gender, businessStage, yearFounded,
           employees, revenue, turnover, progName, programmeType, progStage,
           startDate, endDate, fundingAmt, investor, fundingType, currency };
}

// ── AI extraction via Claude ──────────────────────────────────────────────────
async function aiExtractEntrepreneurs(text, context = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are an expert at extracting entrepreneur and participant data from incubator and accelerator program documents. The document may be written in French, English, or both.

Extract ALL entrepreneurs, participants, applicants, or beneficiaries mentioned. Return a raw JSON array (no markdown, no code blocks — just the JSON starting with "[").

For each person found, use this structure (null for any missing field):
{
  "firstName": string,
  "surname": string,
  "age": number or null,
  "email": string or null,
  "phone": string or null,
  "city": string or null,
  "country": string or null,
  "companyName": string or null,
  "description": string or null (concise 1-3 sentence business description),
  "sector": string or null,
  "gender": "Male" | "Female" | "Non-binary" | null,
  "businessStage": "idea" | "early" | "growth" | "scale" | "mature" | null,
  "yearFounded": number or null,
  "employees": number or null,
  "revenue": number or null,
  "turnover": number or null,
  "programmeName": string or null,
  "programmeType": "incubation" | "acceleration" | "mentorship" | "training" | "fellowship" | "boot_camp" | "grant" | "other" | null,
  "progStage": "active" | "applied" | "graduated" | "dropped" | null,
  "fundingAmount": number or null,
  "investor": string or null
}

Programme context (use these as defaults when the document doesn't specify):
- Incubator: ${context.incubatorSource || 'not specified'}
- Programme: ${context.programmeName || 'not specified'}
- Year: ${context.cohortYear || 'not specified'}
- Donor: ${context.donor || 'not specified'}

Document content:
---
${text.slice(0, 14000)}
---

Return ONLY a JSON array. If no entrepreneur data is found, return [].`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const content = (data.content?.[0]?.text || '').trim();
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]);
  } catch (e) {
    console.error('AI extraction error:', e.message);
    return null;
  }
}

// ── Save a batch of AI-extracted records ──────────────────────────────────────
async function saveAiRecords(aiRows, context, results) {
  const { incubatorSource, programmeName, cohortYear, donor, contextProgType, userId } = context;

  for (const f of aiRows) {
    try {
      const firstN = str(f.firstName);
      const surN   = str(f.surname);
      const name   = (firstN && surN) ? `${firstN} ${surN}` : (firstN || surN || str(f.name) || '');
      if (!name) { results.skipped++; continue; }

      const progType = validProgTypes.includes(f.programmeType) ? f.programmeType : (contextProgType || '');
      const progStage = validStages.includes(f.progStage) ? f.progStage : 'active';

      const progEntry = [{
        programmeName:  f.programmeName || programmeName,
        programmeType:  progType,
        incubator:      incubatorSource,
        year:           cohortYear,
        donor:          donor || undefined,
        stage:          progStage,
        sector:         f.sector || undefined,
      }];

      const fundAmt = parseFloat(f.fundingAmount) || 0;
      const fundEntry = fundAmt > 0 ? [{
        amount: fundAmt, currency: 'USD',
        investor: str(f.investor), type: '',
      }] : [];

      const emailVal = str(f.email).toLowerCase() || undefined;
      let existing = emailVal ? await Entrepreneur.findOne({ email: emailVal }) : null;
      if (!existing && name)
        existing = await Entrepreneur.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i') });

      if (existing) {
        existing.programmes.push(...progEntry);
        if (fundEntry.length) existing.funding.push(...fundEntry);
        existing.totalFunding = existing.funding.reduce((s,fu)=>s+(fu.amount||0),0);
        ['firstName','surname','age','country','city','sector','revenue','turnover',
         'employees','website','businessStage','companyName','description'].forEach(k => {
          if (!existing[k] && f[k]) existing[k] = f[k];
        });
        await existing.save();
        results.merged++;
      } else {
        await Entrepreneur.create({
          firstName: firstN, surname: surN, name,
          age:          parseInt(f.age)||undefined,
          email:        emailVal,
          phone:        str(f.phone)||undefined,
          country:      str(f.country)||undefined,
          city:         str(f.city)||undefined,
          sector:       str(f.sector)||undefined,
          companyName:  str(f.companyName)||undefined,
          description:  str(f.description)||undefined,
          website:      str(f.website)||undefined,
          gender:       ['Male','Female','Non-binary','Prefer not to say'].includes(f.gender) ? f.gender : '',
          businessStage:validBizStages.includes(f.businessStage) ? f.businessStage : '',
          yearFounded:  parseInt(f.yearFounded)||undefined,
          employees:    parseInt(f.employees)||undefined,
          revenue:      parseFloat(f.revenue)||undefined,
          turnover:     parseFloat(f.turnover)||undefined,
          programmes:   progEntry,
          funding:      fundEntry,
          totalFunding: fundAmt,
          source:       incubatorSource,
          addedBy:      userId,
        });
        results.created++;
      }
    } catch (rowErr) { results.errors.push(String(rowErr.message)); }
  }
}

// ── PDF text → rows ───────────────────────────────────────────────────────────
function parsePdfText(text) {
  const splitCells = line => line.split(/\t|\s{2,}/).map(s => s.trim()).filter(Boolean);
  const KEYWORDS = [
    'name','email','phone','country','sector','company','gender','stage',
    'programme','program','funding','revenue','turnover','employees','city',
    'investor','cohort','startup','industry','headcount',
    'nom','prenom','pays','ville','secteur','entreprise','genre','statut',
    'financement','effectif','revenus','courriel','telephone',
  ];

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

    const byIncubator = {}, byYear = {}, byDonor = {}, byProgType = {};
    all.forEach(e => e.programmes.forEach(p => {
      if (p.incubator)    byIncubator[p.incubator]       = (byIncubator[p.incubator]||0)+1;
      if (p.year)         byYear[p.year]                 = (byYear[p.year]||0)+1;
      if (p.donor)        byDonor[p.donor]               = (byDonor[p.donor]||0)+1;
      if (p.programmeType) byProgType[p.programmeType]   = (byProgType[p.programmeType]||0)+1;
    }));

    const cohortMap = {};
    all.forEach(e => e.programmes.forEach(p => {
      const key = [p.incubator||'?', p.programmeName||'?', p.year||'—', p.donor||'—'].join('||');
      if (!cohortMap[key]) cohortMap[key] = {
        incubator: p.incubator, programmeName: p.programmeName,
        programmeType: p.programmeType, year: p.year, donor: p.donor, count: 0,
      };
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
      byProgType:   Object.entries(byProgType).sort((a,b)=>b[1]-a[1]),
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
            companyName, description, website, gender, businessStage, yearFounded,
            employees, revenue, turnover, programmes, funding, source, tags } = req.body;

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
      email, phone, country, city, sector, companyName, description, website,
      gender, businessStage, yearFounded, employees, revenue, turnover,
      programmes: programmes||[], funding: funding||[],
      totalFunding: calcFunding, source, tags: tags||[], addedBy: req.user._id,
    });
    res.status(201).json({ success: true, entrepreneur });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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
    res.status(400).json({ success: false, message: err.message });
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
    const incubatorSource  = req.body.incubatorName  || 'Imported';
    const programmeName    = req.body.programmeName  || '';
    const cohortYear       = parseInt(req.body.year) || undefined;
    const donor            = req.body.donor          || '';
    const contextProgType  = req.body.programmeType  || '';

    const saveContext = { incubatorSource, programmeName, cohortYear, donor, contextProgType, userId: req.user._id };
    const results = { created: 0, merged: 0, skipped: 0, errors: [], method: 'structured' };

    // ── DOCX / DOC → always AI ────────────────────────────────────────────────
    if (ext === 'docx' || ext === 'doc' || mime.includes('wordprocessingml') || mime.includes('msword')) {
      let mammoth;
      try { mammoth = require('mammoth'); }
      catch(e) { return res.status(500).json({ success: false, message: 'Word document support not available — mammoth package missing.' }); }

      const { value: docText } = await mammoth.extractRawText({ buffer: req.file.buffer });
      if (!docText || docText.trim().length < 20)
        return res.status(400).json({ success: false, message: 'Word document appears empty or unreadable.' });

      results.method = 'ai';
      const aiRows = await aiExtractEntrepreneurs(docText, saveContext);
      if (!aiRows) return res.status(500).json({ success: false, message: 'AI extraction failed. Check your ANTHROPIC_API_KEY.' });
      if (!aiRows.length) return res.status(400).json({ success: false, message: 'No entrepreneur data found in this document.' });

      await saveAiRecords(aiRows, saveContext, results);
    }

    // ── PDF ───────────────────────────────────────────────────────────────────
    else if (ext === 'pdf' || mime === 'application/pdf') {
      let pdfParse;
      try { pdfParse = require('pdf-parse'); }
      catch(e) { return res.status(500).json({ success: false, message: 'PDF support not available on server — install pdf-parse.' }); }

      const data = await pdfParse(req.file.buffer);
      const pdfText = data.text || '';

      // Try structured table extraction first
      const rows = parsePdfText(pdfText);

      if (rows.length > 0) {
        // Structured table found — use column mapping
        for (const rawRow of rows) {
          try {
            const f = rowToFields(rawRow);
            if (!f.name) { results.skipped++; continue; }
            const progType = f.programmeType || contextProgType || '';
            const progEntry = [{
              programmeName: f.progName || programmeName,
              programmeType: progType,
              incubator:     incubatorSource,
              year:          cohortYear,
              donor:         donor || undefined,
              stage:         f.progStage,
              startDate:     f.startDate ? new Date(f.startDate) : undefined,
              endDate:       f.endDate   ? new Date(f.endDate)   : undefined,
              sector:        f.sector,
            }];
            const fundEntry = f.fundingAmt > 0 ? [{ amount: f.fundingAmt, currency: f.currency, investor: f.investor, type: f.fundingType }] : [];
            let existing = f.email ? await Entrepreneur.findOne({ email: f.email }) : null;
            if (!existing && f.name)
              existing = await Entrepreneur.findOne({ name: new RegExp(`^${f.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i') });
            if (existing) {
              if (progEntry.length) existing.programmes.push(...progEntry);
              if (fundEntry.length) existing.funding.push(...fundEntry);
              existing.totalFunding = existing.funding.reduce((s,fu)=>s+(fu.amount||0),0);
              ['firstName','surname','age','country','city','sector','revenue','turnover','employees','website','businessStage','companyName','description'].forEach(k => {
                if (!existing[k] && f[k]) existing[k] = f[k];
              });
              await existing.save(); results.merged++;
            } else {
              await Entrepreneur.create({
                firstName:f.firstName, surname:f.surname, name:f.name,
                age:f.age, email:f.email, phone:f.phone, country:f.country, city:f.city,
                sector:f.sector, companyName:f.companyName, description:f.description,
                website:f.website, gender:f.gender, businessStage:f.businessStage,
                yearFounded:f.yearFounded, employees:f.employees, revenue:f.revenue,
                turnover:f.turnover, programmes:progEntry, funding:fundEntry,
                totalFunding:fundEntry.reduce((s,fu)=>s+(fu.amount||0),0),
                source:incubatorSource, addedBy:req.user._id,
              });
              results.created++;
            }
          } catch(rowErr) { results.errors.push(String(rowErr.message)); }
        }
      } else {
        // No table found — use AI
        results.method = 'ai';
        const aiRows = await aiExtractEntrepreneurs(pdfText, saveContext);
        if (!aiRows) return res.status(500).json({ success: false, message: 'PDF has no readable table and AI extraction failed.' });
        if (!aiRows.length) return res.status(400).json({ success: false, message: 'No entrepreneur data found in this PDF.' });
        await saveAiRecords(aiRows, saveContext, results);
      }
    }

    // ── Spreadsheets (xlsx, xls, csv, ods, numbers, tsv, dbf) ────────────────
    else {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      if (!rows.length) return res.status(400).json({ success: false, message: 'File is empty or unreadable.' });

      for (const rawRow of rows) {
        try {
          const f = rowToFields(rawRow);
          if (!f.name) { results.skipped++; continue; }
          const progType = f.programmeType || contextProgType || '';
          const progEntry = (f.progName || programmeName || incubatorSource) ? [{
            programmeName: f.progName || programmeName,
            programmeType: progType,
            incubator:     incubatorSource,
            year:          cohortYear,
            donor:         donor || undefined,
            stage:         f.progStage,
            startDate:     f.startDate ? new Date(f.startDate) : undefined,
            endDate:       f.endDate   ? new Date(f.endDate)   : undefined,
            sector:        f.sector,
          }] : [];
          const fundEntry = f.fundingAmt > 0 ? [{ amount: f.fundingAmt, currency: f.currency, investor: f.investor, type: f.fundingType }] : [];
          let existing = f.email ? await Entrepreneur.findOne({ email: f.email }) : null;
          if (!existing && f.name)
            existing = await Entrepreneur.findOne({ name: new RegExp(`^${f.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i') });
          if (existing) {
            if (progEntry.length) existing.programmes.push(...progEntry);
            if (fundEntry.length) existing.funding.push(...fundEntry);
            existing.totalFunding = existing.funding.reduce((s,fu)=>s+(fu.amount||0),0);
            ['firstName','surname','age','country','city','sector','revenue','turnover','employees','website','businessStage','companyName','description'].forEach(k => {
              if (!existing[k] && f[k]) existing[k] = f[k];
            });
            await existing.save(); results.merged++;
          } else {
            await Entrepreneur.create({
              firstName:f.firstName, surname:f.surname, name:f.name,
              age:f.age, email:f.email, phone:f.phone, country:f.country, city:f.city,
              sector:f.sector, companyName:f.companyName, description:f.description,
              website:f.website, gender:f.gender, businessStage:f.businessStage,
              yearFounded:f.yearFounded, employees:f.employees, revenue:f.revenue,
              turnover:f.turnover, programmes:progEntry, funding:fundEntry,
              totalFunding:fundEntry.reduce((s,fu)=>s+(fu.amount||0),0),
              source:incubatorSource, addedBy:req.user._id,
            });
            results.created++;
          }
        } catch(rowErr) { results.errors.push(String(rowErr.message)); }
      }

      // If structured extraction found nothing, fall back to AI
      if (results.created === 0 && results.merged === 0 && rows.length > 0) {
        results.method = 'ai';
        results.skipped = 0;
        results.errors  = [];
        const rowsAsText = rows.slice(0, 60).map((row, i) =>
          `Record ${i+1}:\n` + Object.entries(row).map(([k,v])=>`  ${k}: ${v}`).join('\n')
        ).join('\n\n');
        const aiRows = await aiExtractEntrepreneurs(rowsAsText, saveContext);
        if (aiRows && aiRows.length) {
          await saveAiRecords(aiRows, saveContext, results);
        } else {
          const rawCols  = Object.keys(rows[0]).slice(0,20).join(', ');
          const normCols = Object.keys(norm(rows[0])).slice(0,20).join(', ');
          return res.json({
            success: false,
            message: `No entrepreneurs imported. ${rows.length} row(s) found but no name column detected and AI extraction found no data. ` +
                     `Raw columns: ${rawCols}. Normalised: ${normCols}.`,
            results,
          });
        }
      }
    }

    if (results.created === 0 && results.merged === 0) {
      return res.json({ success: false, message: 'No entrepreneurs were imported from this file.', results });
    }

    res.json({ success: true, results, method: results.method });
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
      const progs = e.programmes?.length ? e.programmes : [{}];
      return progs.map(p => ({
        Surname:           e.surname||'',
        'First Name':      e.firstName||'',
        'Full Name':       e.name||'',
        Age:               e.age||'',
        Email:             e.email||'',
        Phone:             e.phone||'',
        Company:           e.companyName||'',
        Description:       e.description||'',
        City:              e.city||'',
        Country:           e.country||'',
        Sector:            e.sector||'',
        Turnover:          e.turnover||0,
        Revenue:           e.revenue||0,
        Employees:         e.employees||'',
        Gender:            e.gender||'',
        'Business Stage':  e.businessStage||'',
        Programme:         p.programmeName||'',
        'Programme Type':  p.programmeType||'',
        Incubator:         p.incubator||'',
        Year:              p.year||'',
        Donor:             p.donor||'',
        Stage:             p.stage||'',
        'Total Funding':   e.totalFunding||0,
        'Date Added':      e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '',
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
