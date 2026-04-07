const Diagnostic = require('../models/Diagnostic');
const Lead = require('../models/Lead');
const Notification = require('../models/Notification');
const { sendEmail, diagnosticConfirmation, newLeadNotification, diagnosticResults } = require('../utils/email');

// ── Vertex AI Diagnostic Engine (powered by Claude) ──────────────────────────
async function runAIDiagnostic(data) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('your-key')) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const isFr = data.language === 'fr';

  const prompt = `You are Vertex AI, the diagnostic engine of Vertex Group Africa — a leading strategic consulting firm for African SMEs. Your role is to deliver an honest, insightful, and compelling 360° business diagnostic that reveals the true state of the business, creates urgency around key gaps, and naturally positions Vertex Group Africa as the ideal partner to close those gaps.

IMPORTANT TONE RULES:
- Be direct and honest — do NOT sugarcoat weaknesses, but frame them as opportunities
- Use specific, actionable language — avoid generic advice
- Create a sense of urgency around the most critical issues without being alarmist
- Highlight what is possible with the right support (subtly positioning Vertex)
- The vertex_recommendation must be a compelling, specific next step that makes the entrepreneur want to book a consultation with Vertex Group Africa
- Write in ${isFr ? 'French' : 'English'}

BUSINESS PROFILE:
Company: ${data.company}
Industry: ${data.industry || 'Not specified'}
Country: ${data.country || 'Africa'}
Employees: ${data.employees || 'Not specified'}
Annual Revenue: ${data.revenue || 'Not specified'}
Main challenge: ${data.challenge || 'Not specified'}

SCORING GUIDE:
- 80-100: Excellent — world-class in this area
- 60-79: Strong — performing well with room to optimise
- 40-59: Average — significant gaps that are limiting growth
- 20-39: Needs Work — this area is actively holding the business back
- 0-19: Critical — urgent intervention required

Return ONLY this exact JSON (no markdown, no explanation):
{
  "overall_score": <integer 0-100>,
  "score_label": "<Excellent|Strong|Average|Needs Work|Critical>",
  "executive_summary": "<3 compelling sentences that tell the entrepreneur exactly where they stand, what their biggest risk is right now, and what opportunity they are leaving on the table>",
  "growth_potential": "<2 sentences describing the specific revenue/growth upside if the right moves are made — make it tangible, e.g. '...could double revenue within 18 months...'>",
  "vertex_recommendation": "<A specific, compelling next step — name the Vertex programme or service most relevant (e.g. 90-Day Growth Sprint, Market Entry Programme, Sales Conversion System) and explain in 1-2 sentences exactly why this business needs it now>",
  "dimensions": [
    {
      "id": "strategy",
      "title": "${isFr ? 'Clarté Stratégique' : 'Strategic Clarity'}",
      "score": <integer 0-100>,
      "severity": "<Critical|Medium|Strong>",
      "summary": "<1 punchy sentence — the most important thing to know about this dimension>",
      "analysis": "<3-4 sentences of honest, specific analysis — name what is missing, what the consequence is, and what best practice looks like>",
      "recommendations": [
        "<Specific action with measurable outcome, e.g. 'Define 3 core customer segments within 30 days using the Vertex Market Matrix'>",
        "<Second specific action>",
        "<Third specific action>"
      ]
    },
    {
      "id": "market",
      "title": "${isFr ? 'Position sur le Marché' : 'Market Position'}",
      "score": <integer 0-100>,
      "severity": "<Critical|Medium|Strong>",
      "summary": "<1 punchy sentence>",
      "analysis": "<3-4 sentences>",
      "recommendations": ["<action 1>", "<action 2>", "<action 3>"]
    },
    {
      "id": "sales",
      "title": "${isFr ? 'Performance Commerciale' : 'Sales & Revenue'}",
      "score": <integer 0-100>,
      "severity": "<Critical|Medium|Strong>",
      "summary": "<1 punchy sentence>",
      "analysis": "<3-4 sentences>",
      "recommendations": ["<action 1>", "<action 2>", "<action 3>"]
    },
    {
      "id": "ops",
      "title": "${isFr ? 'Opérations & Processus' : 'Operations & Processes'}",
      "score": <integer 0-100>,
      "severity": "<Critical|Medium|Strong>",
      "summary": "<1 punchy sentence>",
      "analysis": "<3-4 sentences>",
      "recommendations": ["<action 1>", "<action 2>", "<action 3>"]
    },
    {
      "id": "finance",
      "title": "${isFr ? 'Santé Financière' : 'Financial Health'}",
      "score": <integer 0-100>,
      "severity": "<Critical|Medium|Strong>",
      "summary": "<1 punchy sentence>",
      "analysis": "<3-4 sentences>",
      "recommendations": ["<action 1>", "<action 2>", "<action 3>"]
    }
  ]
}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error(`Vertex AI engine error: ${resp.status} — ${errBody?.error?.message || 'unknown'}`);
  }

  const result = await resp.json();
  const text = result.content?.find(b => b.type === 'text')?.text || '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ── POST /api/diagnostics (public) ───────────────────────────────────────────
exports.submitDiagnostic = async (req, res) => {
  try {
    const { name, email, company, country, phone, industry, challenge, employees, revenue, language } = req.body;

    if (!name || !email || !company) {
      return res.status(400).json({ success: false, message: 'Name, email and company are required' });
    }

    const attachments = (req.files || []).map(f => ({
      filename: f.originalname,
      mimetype: f.mimetype,
      size:     f.size,
      path:     f.path,
    }));

    // Create diagnostic record
    const diagnostic = await Diagnostic.create({
      name, email, company, country, phone, industry, challenge, employees, revenue,
      language: language || 'en',
      attachments,
      status: 'pending',
    });

    // Create linked lead
    const lead = await Lead.create({
      name, email, company, country, phone,
      type: 'diagnostic',
      language: language || 'en',
      source: 'website',
      stage: 'new',
    });

    diagnostic.lead = lead._id;
    diagnostic.status = 'processing';
    await diagnostic.save();

    // Send confirmation email to user
    sendEmail(diagnosticConfirmation({ name, email, company }, language));
    // Notify team
    sendEmail(newLeadNotification({ ...lead.toObject(), type: 'diagnostic' }));

    // Dashboard notification
    await Notification.create({
      type:  'new_diagnostic',
      title: `New diagnostic — ${name} (${company})`,
      body:  `${industry || '—'} · ${country || '—'}`,
      relatedLead:       lead._id,
      relatedDiagnostic: diagnostic._id,
    });

    // Run Vertex AI in background
    const lang = language || 'en';
    runAIDiagnostic({ name, email, company, country, industry, challenge, employees, revenue, language: lang })
      .then(async (aiResult) => {
        diagnostic.overallScore         = aiResult.overall_score;
        diagnostic.scoreLabel           = aiResult.score_label;
        diagnostic.executiveSummary     = aiResult.executive_summary;
        diagnostic.growthPotential      = aiResult.growth_potential;
        diagnostic.vertexRecommendation = aiResult.vertex_recommendation;
        diagnostic.dimensions           = aiResult.dimensions;
        diagnostic.status               = 'completed';
        diagnostic.emailSentAt          = new Date();
        await diagnostic.save();

        // Send full results to entrepreneur
        sendEmail(diagnosticResults({
          name,
          email,
          company,
          overallScore:          aiResult.overall_score,
          scoreLabel:            aiResult.score_label,
          executiveSummary:      aiResult.executive_summary,
          growthPotential:       aiResult.growth_potential,
          vertexRecommendation:  aiResult.vertex_recommendation,
          dimensions:            aiResult.dimensions,
        }, lang));

        // Update dashboard notification to show completion
        await Notification.create({
          type:  'new_diagnostic',
          title: `Diagnostic completed — ${name} (${company}) · Score: ${aiResult.overall_score}/100`,
          body:  `${aiResult.score_label} · ${industry || '—'} · ${country || '—'}`,
          relatedLead:       lead._id,
          relatedDiagnostic: diagnostic._id,
        });
      })
      .catch(async (err) => {
        console.error('Vertex AI diagnostic failed:', err.message);
        diagnostic.status = 'failed';
        diagnostic.executiveSummary = `Engine error: ${err.message}`;
        await diagnostic.save();
      });

    res.status(201).json({
      success:      true,
      diagnosticId: diagnostic._id,
      message:      'Diagnostic submitted. Results will be emailed within 45–60 minutes.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/diagnostics/:id/result (public — poll status)
exports.getDiagnosticResult = async (req, res) => {
  try {
    const diagnostic = await Diagnostic.findById(req.params.id).select('-attachments');
    if (!diagnostic) return res.status(404).json({ success: false, message: 'Diagnostic not found' });
    res.json({
      success: true,
      status:  diagnostic.status,
      result:  diagnostic.status === 'completed' ? diagnostic : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/diagnostics (protected — dashboard list)
exports.getDiagnostics = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Diagnostic.countDocuments(filter);
    const diagnostics = await Diagnostic.find(filter)
      .select('-attachments')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), diagnostics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/diagnostics/:id (protected — full detail)
exports.getDiagnostic = async (req, res) => {
  try {
    const diagnostic = await Diagnostic.findById(req.params.id).populate('lead');
    if (!diagnostic) return res.status(404).json({ success: false, message: 'Diagnostic not found' });
    res.json({ success: true, diagnostic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
