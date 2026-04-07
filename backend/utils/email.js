const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email.
 * @param {object} opts - { to, subject, html, text?, attachments? }
 */
const sendEmail = async (opts) => {
  const mailOptions = {
    from:        process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to:          opts.to,
    subject:     opts.subject,
    html:        opts.html,
    text:        opts.text,
    attachments: opts.attachments,
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
};

// ── Email templates ───────────────────────────────────────────────────────────

const newLeadNotification = (lead) => ({
  to: process.env.EMAIL_USER,
  subject: `[Vertex] New ${lead.type} from ${lead.name} (${lead.company || lead.country || 'website'})`,
  html: `
    <h2 style="color:#0d9e6e">New ${lead.type} received</h2>
    <table style="border-collapse:collapse;width:100%;font-family:sans-serif">
      <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Name</td><td style="padding:8px;border:1px solid #eee">${lead.name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #eee">${lead.email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Company</td><td style="padding:8px;border:1px solid #eee">${lead.company || '—'}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Country</td><td style="padding:8px;border:1px solid #eee">${lead.country || '—'}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Service</td><td style="padding:8px;border:1px solid #eee">${lead.service || lead.plan || '—'}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #eee">${lead.message || '—'}</td></tr>
    </table>
    <p style="margin-top:16px;color:#888;font-size:12px">Vertex Group Africa CRM · ${new Date().toISOString()}</p>
  `,
});

const diagnosticConfirmation = (data, lang = 'en') => {
  const isFr = lang === 'fr';
  return {
    to: data.email,
    subject: isFr
      ? 'Votre diagnostic est en cours — Vertex Group Africa'
      : 'Your diagnostic is being prepared — Vertex Group Africa',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#0d9e6e">${isFr ? 'Nous avons bien reçu votre demande.' : 'We have received your request.'}</h2>
        <p>${isFr ? `Bonjour ${data.name},` : `Hello ${data.name},`}</p>
        <p>${isFr
          ? `Votre diagnostic 360° pour <strong>${data.company}</strong> est en cours de préparation. Vous recevrez les résultats dans <strong>45–60 minutes</strong>.`
          : `Your 360° business diagnostic for <strong>${data.company}</strong> is being prepared. You will receive results within <strong>45–60 minutes</strong>.`}</p>
        <p style="margin-top:24px;color:#888;font-size:12px">Vertex Group Africa · info@vertexgroup.africa</p>
      </div>
    `,
  };
};

const newsletterConfirmation = (data, lang = 'en') => {
  const isFr = lang === 'fr';
  return {
    to: data.email,
    subject: isFr
      ? 'Bienvenue dans la communauté Vertex !'
      : 'Welcome to the Vertex community!',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#0d9e6e">${isFr ? 'Abonnement confirmé.' : 'Subscription confirmed.'}</h2>
        <p>${isFr
          ? `Bienvenue ${data.name || ''} ! Vous êtes maintenant abonné(e) à la newsletter Vertex Group Africa.`
          : `Welcome ${data.name || ''}! You are now subscribed to the Vertex Group Africa newsletter.`}</p>
        <p>${isFr
          ? 'Vous recevrez chaque mois les meilleurs insights sur les marchés africains, la stratégie et les opportunités de croissance.'
          : 'Every month you will receive the best insights on African markets, strategy, and growth opportunities.'}</p>
        <p style="margin-top:24px;color:#888;font-size:12px">Vertex Group Africa · info@vertexgroup.africa</p>
      </div>
    `,
  };
};

const diagnosticResults = (data, lang = 'en') => {
  const isFr = lang === 'fr';
  const score = data.overallScore;
  const scoreColor = score >= 70 ? '#0d9e6e' : score >= 45 ? '#f59e0b' : '#ef4444';
  const scoreBg    = score >= 70 ? '#f0fdf8' : score >= 45 ? '#fffbeb' : '#fef2f2';

  // Critical dimensions (score < 50) for the urgent action box
  const criticals = (data.dimensions || []).filter(d => d.score < 50);

  const dimensionBlocks = (data.dimensions || []).map(d => {
    const dc = d.score >= 70 ? '#0d9e6e' : d.score >= 45 ? '#f59e0b' : '#ef4444';
    const db = d.score >= 70 ? '#f0fdf8' : d.score >= 45 ? '#fffbeb' : '#fef2f2';
    const pct = d.score;
    return `
    <div style="margin-bottom:20px;padding:18px 20px;background:#fafafa;border-radius:8px;border-left:4px solid ${dc}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:600;font-size:14px;color:#0a0a0a">${d.title}</span>
        <span style="font-weight:800;font-size:18px;color:${dc}">${d.score}<span style="font-size:12px;font-weight:400;color:#888">/100</span></span>
      </div>
      <!-- progress bar -->
      <div style="background:#e5e7eb;border-radius:99px;height:6px;margin-bottom:10px">
        <div style="background:${dc};width:${pct}%;height:6px;border-radius:99px"></div>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#333;font-style:italic">${d.summary}</p>
      <p style="margin:0;font-size:13px;color:#555;line-height:1.6">${d.analysis}</p>
      ${d.recommendations && d.recommendations.length ? `
      <div style="margin-top:10px">
        ${d.recommendations.map(r => `<div style="display:flex;gap:8px;margin-top:6px;font-size:12px;color:#444"><span style="color:${dc};font-weight:700;flex-shrink:0">→</span>${r}</div>`).join('')}
      </div>` : ''}
    </div>`;
  }).join('');

  const criticalBox = criticals.length ? `
  <div style="margin:28px 0;padding:22px 24px;background:#0a0a0a;border-radius:8px">
    <p style="margin:0 0 4px;color:#f59e0b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">
      ${isFr ? '⚠ Zones critiques nécessitant une action immédiate' : '⚠ Critical Areas Requiring Immediate Action'}
    </p>
    <p style="margin:0 0 12px;color:#e5e7eb;font-size:13px">
      ${isFr
        ? `${criticals.length} dimension${criticals.length>1?'s':''} de votre entreprise sont en zone rouge. Chaque mois sans intervention coûte de la croissance.`
        : `${criticals.length} dimension${criticals.length>1?'s':''} of your business are in the red zone. Every month without intervention costs you growth.`}
    </p>
    ${criticals.map(c => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:13px"><span style="color:#f5f4f0">${c.title}</span><span style="color:#ef4444;font-weight:700">${c.score}/100</span></div>`).join('')}
  </div>` : '';

  return {
    to: data.email,
    subject: isFr
      ? `[Vertex AI] Votre diagnostic 360° — ${data.company} · Score: ${score}/100`
      : `[Vertex AI] Your 360° Business Diagnostic — ${data.company} · Score: ${score}/100`,
    html: `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;color:#0a0a0a">

      <!-- HEADER -->
      <div style="background:#0a0a0a;padding:28px 40px;text-align:center">
        <div style="display:inline-block;background:#0d9e6e;width:40px;height:40px;border-radius:10px;line-height:40px;font-size:20px;font-weight:900;color:#fff;text-align:center;margin-bottom:12px">V</div>
        <div style="color:#f5f4f0;font-size:18px;font-weight:700;letter-spacing:0.08em">VERTEX AI</div>
        <div style="color:#6b7280;font-size:11px;margin-top:2px;letter-spacing:0.06em">${isFr ? 'MOTEUR DE DIAGNOSTIC · VERTEX GROUP AFRICA' : 'DIAGNOSTIC ENGINE · VERTEX GROUP AFRICA'}</div>
      </div>

      <!-- SCORE HERO -->
      <div style="background:${scoreBg};padding:36px 40px;text-align:center;border-bottom:4px solid ${scoreColor}">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280">
          ${isFr ? `Diagnostic 360° — ${data.company}` : `360° Diagnostic — ${data.company}`}
        </p>
        <div style="font-size:80px;font-weight:900;color:${scoreColor};line-height:1;margin:8px 0">${score}</div>
        <div style="font-size:11px;color:#9ca3af;margin-bottom:4px">${isFr ? 'score sur 100' : 'score out of 100'}</div>
        <div style="display:inline-block;background:${scoreColor};color:#fff;font-size:13px;font-weight:700;padding:4px 16px;border-radius:99px;margin-bottom:16px">${data.scoreLabel}</div>
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;max-width:480px;margin-left:auto;margin-right:auto">${data.executiveSummary}</p>
      </div>

      <div style="padding:32px 40px">

        <!-- GREETING -->
        <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px">
          ${isFr ? `Bonjour ${data.name},` : `Hello ${data.name},`}<br><br>
          ${isFr
            ? `Votre diagnostic Vertex AI est prêt. Voici une analyse complète et honnête de <strong>${data.company}</strong> à travers 5 dimensions stratégiques.`
            : `Your Vertex AI diagnostic is ready. Below is a complete and honest analysis of <strong>${data.company}</strong> across 5 strategic dimensions.`}
        </p>

        <!-- GROWTH POTENTIAL -->
        ${data.growthPotential ? `
        <div style="padding:20px 24px;background:#f0fdf8;border-left:4px solid #0d9e6e;border-radius:6px;margin-bottom:28px">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#065c40">
            ${isFr ? '📈 Potentiel de croissance identifié' : '📈 Growth Potential Identified'}
          </p>
          <p style="margin:0;font-size:14px;color:#065c40;line-height:1.6;font-weight:500">${data.growthPotential}</p>
        </div>` : ''}

        <!-- DIMENSION SCORES HEADING -->
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;margin:0 0 16px;border-bottom:2px solid #f3f4f6;padding-bottom:10px">
          ${isFr ? 'Analyse par dimension' : 'Dimension Analysis'}
        </h2>

        ${dimensionBlocks}

        ${criticalBox}

        <!-- VERTEX RECOMMENDATION -->
        ${data.vertexRecommendation ? `
        <div style="padding:24px;background:#0c94d8;border-radius:8px;margin-bottom:28px">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.7)">
            ${isFr ? '🎯 Recommandation Vertex' : '🎯 Vertex Recommendation'}
          </p>
          <p style="margin:0;font-size:14px;color:#ffffff;line-height:1.7;font-weight:500">${data.vertexRecommendation}</p>
        </div>` : ''}

        <!-- CTA BLOCK -->
        <div style="background:#0a0a0a;border-radius:12px;padding:32px;text-align:center">
          <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:#f5f4f0">
            ${isFr ? 'Transformez votre diagnostic en résultats.' : 'Turn your diagnostic into results.'}
          </p>
          <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;line-height:1.6">
            ${isFr
              ? 'Nos consultants senior ont aidé des centaines de PME africaines à doubler leur croissance. Réservez votre consultation stratégique gratuite de 60 minutes — sans engagement.'
              : 'Our senior consultants have helped hundreds of African SMEs double their growth. Book your free 60-minute strategy consultation — no commitment required.'}
          </p>
          <a href="https://vertexgroup.africa" style="display:inline-block;background:#0d9e6e;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:6px;font-weight:700;font-size:15px;letter-spacing:0.04em;margin-bottom:16px">
            ${isFr ? 'Réserver ma consultation gratuite →' : 'Book My Free Consultation →'}
          </a>
          <p style="margin:0;font-size:12px;color:#6b7280">
            ${isFr ? 'Ou répondez à cet email — nous vous contacterons dans les 24h.' : 'Or reply to this email — we will reach out within 24 hours.'}
          </p>
        </div>

      </div>

      <!-- FOOTER -->
      <div style="padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6">
        <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600">Vertex Group Africa</p>
        <p style="margin:0 0 4px;color:#9ca3af;font-size:12px">info@vertexgroup.africa · vertexgroup.africa</p>
        <p style="margin:8px 0 0;color:#d1d5db;font-size:11px">
          ${isFr ? 'Propulsé par Vertex AI · Moteur d\'analyse stratégique exclusif' : 'Powered by Vertex AI · Exclusive strategic analysis engine'}
        </p>
      </div>
    </div>
    `,
  };
};

module.exports = { sendEmail, newLeadNotification, diagnosticConfirmation, newsletterConfirmation, diagnosticResults };
