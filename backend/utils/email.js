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
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#0c94d8">New ${lead.type} received</h2>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif">
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Name</td><td style="padding:8px;border:1px solid #eee">${lead.name}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #eee">${lead.email}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Company</td><td style="padding:8px;border:1px solid #eee">${lead.company || '—'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Country</td><td style="padding:8px;border:1px solid #eee">${lead.country || '—'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Service</td><td style="padding:8px;border:1px solid #eee">${lead.service || lead.plan || '—'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #eee">${lead.message || '—'}</td></tr>
      </table>
      <p style="margin-top:16px;color:#888;font-size:12px">Vertex Group Africa CRM · ${new Date().toISOString()}</p>
    </div>
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
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff">
        <div style="background:#0a0a0a;padding:24px 40px;text-align:center">
          <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.12em">VERTEX GROUP AFRICA</div>
          <div style="color:#9ca3af;font-size:11px;margin-top:4px;letter-spacing:0.08em">${isFr ? 'INTELLIGENCE STRATÉGIQUE' : 'STRATEGIC INTELLIGENCE'}</div>
        </div>
        <div style="padding:40px">
          <h2 style="color:#0a0a0a;font-size:22px;font-weight:700;margin:0 0 16px">${isFr ? 'Nous avons bien reçu votre demande.' : 'We have received your request.'}</h2>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px">${isFr ? `Bonjour ${data.name},` : `Hello ${data.name},`}</p>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px">${isFr
            ? `Votre diagnostic 360° pour <strong>${data.company}</strong> est en cours de préparation. Vous recevrez les résultats complets dans <strong>45–60 minutes</strong>.`
            : `Your 360° business diagnostic for <strong>${data.company}</strong> is being prepared. You will receive your full results within <strong>45–60 minutes</strong>.`}</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center">
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.08em">${isFr ? 'Ce que vous allez recevoir' : 'What you will receive'}</p>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.8">${isFr
              ? '✓ Score global sur 100 · ✓ Analyse 5 dimensions · ✓ Recommandation Vertex · ✓ Plan d\'action prioritaire'
              : '✓ Overall score out of 100 · ✓ 5-dimension analysis · ✓ Vertex recommendation · ✓ Priority action plan'}</p>
          </div>
        </div>
        <div style="background:#0a0a0a;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">Vertex Group Africa · info@vertexgroup.africa · vertexgroup.africa</p>
        </div>
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
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff">
        <div style="background:#0a0a0a;padding:24px 40px;text-align:center">
          <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.12em">VERTEX GROUP AFRICA</div>
          <div style="color:#9ca3af;font-size:11px;margin-top:4px;letter-spacing:0.08em">${isFr ? 'INTELLIGENCE STRATÉGIQUE' : 'STRATEGIC INTELLIGENCE'}</div>
        </div>
        <div style="padding:40px">
          <h2 style="color:#0a0a0a;font-size:22px;font-weight:700;margin:0 0 16px">${isFr ? 'Abonnement confirmé.' : 'Subscription confirmed.'}</h2>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px">${isFr
            ? `Bienvenue ${data.name || ''} ! Vous êtes maintenant abonné(e) à la newsletter Vertex Group Africa.`
            : `Welcome ${data.name || ''}! You are now subscribed to the Vertex Group Africa newsletter.`}</p>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px">${isFr
            ? 'Chaque mois, recevez les meilleurs insights sur les marchés africains, la stratégie d\'entreprise et les opportunités de croissance.'
            : 'Every month, receive the best insights on African markets, business strategy, and growth opportunities.'}</p>
          <a href="https://vertexgroup.africa" style="display:inline-block;background:#0c94d8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:4px;font-weight:700;font-size:14px;letter-spacing:0.04em">${isFr ? 'Visiter notre site →' : 'Visit our website →'}</a>
        </div>
        <div style="background:#0a0a0a;padding:20px 40px;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">Vertex Group Africa · info@vertexgroup.africa · vertexgroup.africa</p>
        </div>
      </div>
    `,
  };
};

// ── DIAGNOSTIC RESULTS ────────────────────────────────────────────────────────
// Color scheme: #0a0a0a black, #ffffff white, #0c94d8 blue CTAs only.
// No green in the client-facing report.
const diagnosticResults = (data, lang = 'en') => {
  const isFr = lang === 'fr';
  const score = data.overallScore;

  // Score tier colours — all using the website palette
  const scoreColor  = score >= 70 ? '#0c94d8' : score >= 45 ? '#d97706' : '#dc2626';
  const scoreBg     = score >= 70 ? '#eff8ff' : score >= 45 ? '#fffbeb' : '#fef2f2';
  const scoreBorder = scoreColor;

  // Dimension colours — blue for strong, amber for medium, red for critical
  const dimColor = (s) => s >= 70 ? '#0c94d8' : s >= 45 ? '#d97706' : '#dc2626';

  const criticals = (data.dimensions || []).filter(d => d.score < 50);

  const dimensionBlocks = (data.dimensions || []).map(d => {
    const dc = dimColor(d.score);
    const db = dimBg(d.score);
    return `
    <div style="margin-bottom:24px;background:#fafafa;border-radius:4px;border-left:4px solid ${dc};padding:20px 24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-weight:700;font-size:14px;color:#0a0a0a;letter-spacing:0.02em;text-transform:uppercase">${d.title}</span>
        <span style="font-weight:900;font-size:22px;color:${dc}">${d.score}<span style="font-size:11px;font-weight:400;color:#9ca3af">/100</span></span>
      </div>
      <div style="background:#e5e7eb;border-radius:99px;height:5px;margin-bottom:14px">
        <div style="background:${dc};width:${d.score}%;height:5px;border-radius:99px"></div>
      </div>
      <p style="margin:0 0 10px;font-size:13px;color:#0a0a0a;font-weight:600;font-style:italic">${d.summary || ''}</p>
      <p style="margin:0 0 12px;font-size:13px;color:#4b5563;line-height:1.7">${d.analysis || ''}</p>
      ${d.recommendations && d.recommendations.length ? `
      <div style="border-top:1px solid #e5e7eb;padding-top:10px;margin-top:4px">
        ${d.recommendations.map(r => `
        <div style="display:flex;gap:10px;margin-top:8px;font-size:12px;color:#374151;align-items:flex-start">
          <span style="color:${dc};font-weight:800;flex-shrink:0;font-size:14px;line-height:1.2">→</span>
          <span style="line-height:1.6">${r}</span>
        </div>`).join('')}
      </div>` : ''}
    </div>`;
  }).join('');

  const criticalBox = criticals.length ? `
  <div style="margin:32px 0;background:#0a0a0a;border-radius:6px;padding:28px 32px">
    <p style="margin:0 0 6px;color:#f59e0b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em">
      ${isFr ? '⚠ ZONES CRITIQUES — ACTION IMMÉDIATE REQUISE' : '⚠ CRITICAL AREAS — IMMEDIATE ACTION REQUIRED'}
    </p>
    <p style="margin:0 0 20px;color:#d1d5db;font-size:13px;line-height:1.6">
      ${isFr
        ? `${criticals.length} dimension${criticals.length>1?'s':''} de votre entreprise sont en zone rouge. Chaque mois sans intervention représente de la croissance perdue.`
        : `${criticals.length} dimension${criticals.length>1?'s':''} of your business are in the critical zone. Every month without action means growth left on the table.`}
    </p>
    ${criticals.map(c => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,0.1);font-size:13px">
      <span style="color:#f5f4f0;font-weight:500">${c.title}</span>
      <span style="color:#dc2626;font-weight:800;font-size:15px">${c.score}/100</span>
    </div>`).join('')}
  </div>` : '';

  return {
    to: data.email,
    subject: isFr
      ? `Votre diagnostic 360° — ${data.company} · Score: ${score}/100`
      : `Your 360° Business Diagnostic — ${data.company} · Score: ${score}/100`,
    html: `
<!DOCTYPE html>
<html lang="${isFr?'fr':'en'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;-webkit-font-smoothing:antialiased">
<div style="max-width:660px;margin:0 auto;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

  <!-- ═══ HEADER ═══ -->
  <div style="background:#0a0a0a;padding:0">
    <div style="padding:28px 48px 20px;border-bottom:1px solid rgba(255,255,255,0.08)">
      <table style="width:100%;border-collapse:collapse"><tr>
        <td style="vertical-align:middle">
          <div style="color:#ffffff;font-size:17px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase">VERTEX GROUP AFRICA</div>
          <div style="color:#6b7280;font-size:10px;margin-top:3px;letter-spacing:0.1em;text-transform:uppercase">${isFr ? 'Moteur de diagnostic stratégique' : 'Strategic Diagnostic Engine'}</div>
        </td>
        <td style="text-align:right;vertical-align:middle">
          <div style="display:inline-block;background:#0c94d8;color:#ffffff;font-size:9px;font-weight:800;padding:5px 12px;border-radius:2px;letter-spacing:0.1em;text-transform:uppercase">${isFr ? 'RAPPORT CONFIDENTIEL' : 'CONFIDENTIAL REPORT'}</div>
        </td>
      </tr></table>
    </div>
    <!-- Score hero -->
    <div style="padding:40px 48px;background:${scoreBg};border-top:4px solid ${scoreBorder}">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:8px">
        ${isFr ? `Diagnostic 360° — ${data.company}` : `360° Business Diagnostic — ${data.company}`}
      </div>
      <div style="display:flex;align-items:flex-end;gap:20px;flex-wrap:wrap">
        <div>
          <div style="font-size:88px;font-weight:900;color:${scoreBorder};line-height:1;margin-bottom:4px">${score}</div>
          <div style="font-size:11px;color:#9ca3af;letter-spacing:0.06em">${isFr ? 'SCORE SUR 100' : 'SCORE OUT OF 100'}</div>
        </div>
        <div style="flex:1;min-width:180px">
          <div style="background:${scoreBorder};color:#fff;font-size:12px;font-weight:700;padding:5px 16px;border-radius:2px;display:inline-block;letter-spacing:0.06em;margin-bottom:12px">${data.scoreLabel || ''}</div>
          <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;font-weight:400">${data.executiveSummary || ''}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ BODY ═══ -->
  <div style="padding:40px 48px">

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 8px">
      ${isFr ? `Bonjour <strong>${data.name}</strong>,` : `Hello <strong>${data.name}</strong>,`}
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 32px">
      ${isFr
        ? `Votre analyse Vertex AI est prête. Voici un rapport complet et sans concession de <strong>${data.company}</strong> à travers 5 dimensions stratégiques clés.`
        : `Your Vertex AI analysis is ready. Below is a complete, unfiltered assessment of <strong>${data.company}</strong> across 5 key strategic dimensions.`}
    </p>

    ${data.growthPotential ? `
    <div style="border-left:4px solid #0c94d8;background:#eff8ff;padding:18px 24px;border-radius:0 4px 4px 0;margin-bottom:32px">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#0c94d8;margin-bottom:6px">
        ${isFr ? '📈 POTENTIEL DE CROISSANCE IDENTIFIÉ' : '📈 GROWTH POTENTIAL IDENTIFIED'}
      </div>
      <p style="margin:0;font-size:14px;color:#1e3a5f;line-height:1.7;font-weight:500">${data.growthPotential}</p>
    </div>` : ''}

    <!-- Section heading -->
    <div style="border-bottom:2px solid #0a0a0a;padding-bottom:8px;margin-bottom:28px">
      <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:#0a0a0a">
        ${isFr ? 'Analyse par dimension' : 'Dimension Analysis'}
      </span>
    </div>

    ${dimensionBlocks}

    ${criticalBox}

    <!-- Vertex Recommendation -->
    ${data.vertexRecommendation ? `
    <div style="background:#0a0a0a;border-radius:4px;padding:28px 32px;margin-bottom:32px">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:#0c94d8;margin-bottom:10px">
        ${isFr ? '🎯 RECOMMANDATION VERTEX' : '🎯 VERTEX RECOMMENDATION'}
      </div>
      <p style="margin:0;font-size:15px;color:#f5f4f0;line-height:1.8;font-weight:400">${data.vertexRecommendation}</p>
    </div>` : ''}

    <!-- CTA -->
    <div style="background:#eff8ff;border:1px solid #bfdbfe;border-radius:4px;padding:36px 40px;text-align:center;margin-bottom:8px">
      <div style="font-size:22px;font-weight:800;color:#0a0a0a;margin-bottom:10px;line-height:1.3">
        ${isFr ? 'Transformez ce diagnostic en résultats concrets.' : 'Turn this diagnostic into concrete results.'}
      </div>
      <p style="margin:0 0 28px;font-size:14px;color:#4b5563;line-height:1.7;max-width:480px;margin-left:auto;margin-right:auto">
        ${isFr
          ? 'Nos consultants senior accompagnent les PME africaines vers une croissance mesurable. Réservez votre consultation stratégique gratuite de 60 minutes — sans engagement.'
          : 'Our senior consultants guide African SMEs toward measurable growth. Book your free 60-minute strategy consultation — no commitment required.'}
      </p>
      <a href="https://vertexgroup.africa" style="display:inline-block;background:#0c94d8;color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:4px;font-weight:800;font-size:14px;letter-spacing:0.06em;text-transform:uppercase">
        ${isFr ? 'Réserver ma consultation gratuite →' : 'Book My Free Consultation →'}
      </a>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">
        ${isFr ? 'Ou répondez directement à cet email — nous vous recontactons sous 24h.' : 'Or reply directly to this email — we will reach out within 24 hours.'}
      </p>
    </div>

  </div>

  <!-- ═══ FOOTER ═══ -->
  <div style="background:#0a0a0a;padding:28px 48px">
    <table style="width:100%;border-collapse:collapse"><tr>
      <td style="vertical-align:top">
        <div style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.08em;margin-bottom:4px">VERTEX GROUP AFRICA</div>
        <div style="color:#6b7280;font-size:11px;line-height:1.6">
          info@vertexgroup.africa<br>
          vertexgroup.africa
        </div>
      </td>
      <td style="text-align:right;vertical-align:top">
        <div style="color:#4b5563;font-size:10px;line-height:1.8">
          ${isFr ? 'Propulsé par Vertex AI<br>Moteur d\'analyse stratégique exclusif' : 'Powered by Vertex AI<br>Exclusive strategic analysis engine'}
        </div>
      </td>
    </tr></table>
    <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:20px;padding-top:16px;text-align:center">
      <p style="margin:0;color:#4b5563;font-size:10px;line-height:1.7">
        ${isFr
          ? 'Ce rapport a été généré automatiquement par le moteur Vertex AI sur la base des informations fournies. Il est strictement confidentiel et destiné uniquement à son destinataire.'
          : 'This report was automatically generated by the Vertex AI engine based on information provided. It is strictly confidential and intended solely for its recipient.'}
      </p>
    </div>
  </div>

</div>
</body>
</html>
    `,
  };
};

// ── NEWSLETTER BROADCAST ──────────────────────────────────────────────────────
// McKinsey-style professional newsletter template.
// Color scheme: #0a0a0a black, #ffffff white, #0c94d8 blue CTAs.
/**
 * Build a broadcast newsletter HTML from dashboard compose input.
 * The dashboard sends raw HTML body — this function wraps it in the full
 * professional newsletter shell.
 *
 * @param {object} opts - { subject, bodyHtml, subscriberName }
 * @param {string} lang - 'en' | 'fr'
 */
const buildNewsletterHtml = (opts, lang = 'en') => {
  const isFr  = lang === 'fr';
  const name  = opts.subscriberName || (isFr ? 'cher lecteur' : 'there');
  const month = new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-GB', { month: 'long', year: 'numeric' });
  const issue = opts.issueLabel || (isFr ? `Édition ${month}` : `${month} Edition`);

  return `
<!DOCTYPE html>
<html lang="${isFr?'fr':'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${opts.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0ef;-webkit-font-smoothing:antialiased">
<div style="max-width:680px;margin:0 auto;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

  <!-- ═══ HEADER ═══ -->
  <div style="background:#0a0a0a;padding:0">

    <!-- Top bar -->
    <div style="padding:12px 48px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between">
      <span style="color:#6b7280;font-size:10px;letter-spacing:0.1em;text-transform:uppercase">${issue}</span>
      <a href="https://vertexgroup.africa" style="color:#0c94d8;font-size:10px;text-decoration:none;letter-spacing:0.06em;text-transform:uppercase">${isFr ? 'Voir en ligne →' : 'View online →'}</a>
    </div>

    <!-- Masthead -->
    <div style="padding:36px 48px 32px;text-align:center">
      <div style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:6px">VERTEX GROUP AFRICA</div>
      <div style="width:48px;height:2px;background:#0c94d8;margin:0 auto 12px"></div>
      <div style="color:#9ca3af;font-size:11px;letter-spacing:0.12em;text-transform:uppercase">
        ${isFr ? 'Intelligence · Stratégie · Croissance' : 'Intelligence · Strategy · Growth'}
      </div>
    </div>

    <!-- Issue banner -->
    <div style="background:#0c94d8;padding:14px 48px;text-align:center">
      <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">
        ${opts.subject}
      </span>
    </div>
  </div>

  <!-- ═══ EDITORIAL INTRO ═══ -->
  <div style="background:#ffffff;padding:40px 48px 32px;border-bottom:1px solid #e5e5e3">
    <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;letter-spacing:0.06em;text-transform:uppercase;font-weight:600">
      ${isFr ? 'Dans ce numéro' : "In this issue"}
    </p>
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.8">
      ${isFr ? `Bonjour <strong>${name}</strong>,` : `Hello <strong>${name}</strong>,`}
    </p>
  </div>

  <!-- ═══ MAIN CONTENT (from dashboard compose) ═══ -->
  <div style="background:#ffffff;padding:0 48px 8px">
    <div style="font-size:15px;color:#1f2937;line-height:1.9;padding:28px 0">
      ${opts.bodyHtml}
    </div>
  </div>

  <!-- ═══ DIVIDER ═══ -->
  <div style="background:#ffffff;padding:0 48px 40px">
    <div style="border-top:2px solid #0a0a0a;padding-top:32px">

      <!-- Quote / Pull quote -->
      <div style="border-left:4px solid #0c94d8;padding:16px 24px;margin-bottom:32px;background:#eff8ff">
        <p style="margin:0;font-size:16px;font-style:italic;color:#0a0a0a;font-weight:600;line-height:1.6">
          ${isFr
            ? '"Les entreprises africaines qui investissent dans leur stratégie aujourd\'hui construisent les leaders de demain."'
            : '"African businesses that invest in their strategy today are building tomorrow\'s market leaders."'}
        </p>
        <p style="margin:8px 0 0;font-size:11px;color:#0c94d8;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">— Vertex Group Africa</p>
      </div>

      <!-- Service cards -->
      <div style="margin-bottom:32px">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:#0a0a0a;margin-bottom:20px;border-bottom:1px solid #e5e5e3;padding-bottom:10px">
          ${isFr ? 'Nos programmes' : 'Our programmes'}
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="width:50%;padding:0 8px 0 0;vertical-align:top">
              <div style="border:1px solid #e5e5e3;border-radius:4px;padding:20px;margin-bottom:12px">
                <div style="font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#0c94d8;margin-bottom:6px">${isFr ? 'DIAGNOSTIC 360°' : '360° DIAGNOSTIC'}</div>
                <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6">${isFr ? 'Obtenez une analyse complète de votre entreprise en 5 dimensions stratégiques — score inclus.' : 'Get a full 5-dimension strategic analysis of your business — with a score out of 100.'}</p>
              </div>
              <div style="border:1px solid #e5e5e3;border-radius:4px;padding:20px">
                <div style="font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#0c94d8;margin-bottom:6px">${isFr ? 'PROGRAMME TTT' : 'TTT PROGRAMME'}</div>
                <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6">${isFr ? 'Formation intensive pour dirigeants et équipes de vente africaines.' : 'Intensive training for African business leaders and sales teams.'}</p>
              </div>
            </td>
            <td style="width:50%;padding:0 0 0 8px;vertical-align:top">
              <div style="border:1px solid #e5e5e3;border-radius:4px;padding:20px;margin-bottom:12px">
                <div style="font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#0c94d8;margin-bottom:6px">${isFr ? 'INCUBATION PME' : 'SME INCUBATION'}</div>
                <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6">${isFr ? 'Accompagnement 90 jours avec un consultant dédié pour accélérer votre croissance.' : '90-day acceleration with a dedicated consultant to drive your growth.'}</p>
              </div>
              <div style="border:1px solid #e5e5e3;border-radius:4px;padding:20px">
                <div style="font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#0c94d8;margin-bottom:6px">${isFr ? 'ACCÈS AUX FINANCEMENTS' : 'DONOR MATCHING'}</div>
                <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6">${isFr ? 'Mise en relation avec bailleurs, investisseurs et partenaires stratégiques.' : 'Connect with donors, investors, and strategic partners across Africa.'}</p>
              </div>
            </td>
          </tr>
        </table>
      </div>

    </div>
  </div>

  <!-- ═══ CTA BLOCK ═══ -->
  <div style="background:#0a0a0a;padding:44px 48px;text-align:center">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#0c94d8;margin-bottom:12px">
      ${isFr ? 'PASSEZ À L\'ACTION' : 'TAKE ACTION'}
    </div>
    <div style="font-size:26px;font-weight:900;color:#ffffff;margin-bottom:14px;line-height:1.3">
      ${isFr ? 'Votre entreprise est-elle prête<br>pour la prochaine étape ?' : 'Is your business ready<br>for the next level?'}
    </div>
    <p style="margin:0 0 32px;font-size:14px;color:#9ca3af;line-height:1.7;max-width:440px;margin-left:auto;margin-right:auto">
      ${isFr
        ? 'Obtenez votre diagnostic gratuit en ligne et recevez un rapport complet sur la santé stratégique de votre entreprise.'
        : 'Get your free diagnostic online and receive a full report on the strategic health of your business.'}
    </p>
    <a href="https://vertexgroup.africa" style="display:inline-block;background:#0c94d8;color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:4px;font-weight:800;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px">
      ${isFr ? 'Démarrer mon diagnostic gratuit →' : 'Start My Free Diagnostic →'}
    </a>
    <br>
    <a href="https://vertexgroup.africa" style="display:inline-block;border:1px solid rgba(255,255,255,0.2);color:#d1d5db;text-decoration:none;padding:12px 36px;border-radius:4px;font-weight:600;font-size:12px;letter-spacing:0.06em;text-transform:uppercase">
      ${isFr ? 'Demander un devis' : 'Request a quote'}
    </a>
  </div>

  <!-- ═══ STATS STRIP ═══ -->
  <div style="background:#0c94d8;padding:0">
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:20px;text-align:center;border-right:1px solid rgba(255,255,255,0.2)">
          <div style="font-size:24px;font-weight:900;color:#ffffff">6</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.8);letter-spacing:0.08em;text-transform:uppercase;margin-top:2px">${isFr ? 'Pays couverts' : 'Countries covered'}</div>
        </td>
        <td style="padding:20px;text-align:center;border-right:1px solid rgba(255,255,255,0.2)">
          <div style="font-size:24px;font-weight:900;color:#ffffff">500+</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.8);letter-spacing:0.08em;text-transform:uppercase;margin-top:2px">${isFr ? 'PME accompagnées' : 'SMEs supported'}</div>
        </td>
        <td style="padding:20px;text-align:center;border-right:1px solid rgba(255,255,255,0.2)">
          <div style="font-size:24px;font-weight:900;color:#ffffff">90</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.8);letter-spacing:0.08em;text-transform:uppercase;margin-top:2px">${isFr ? 'Jours vers la croissance' : 'Days to growth'}</div>
        </td>
        <td style="padding:20px;text-align:center">
          <div style="font-size:24px;font-weight:900;color:#ffffff">100%</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.8);letter-spacing:0.08em;text-transform:uppercase;margin-top:2px">${isFr ? 'Engagement résultats' : 'Results focused'}</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div style="background:#0a0a0a;padding:32px 48px">
    <table style="width:100%;border-collapse:collapse"><tr>
      <td style="vertical-align:top">
        <div style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">VERTEX GROUP AFRICA</div>
        <div style="color:#6b7280;font-size:11px;line-height:1.8">
          info@vertexgroup.africa<br>
          vertexgroup.africa
        </div>
      </td>
      <td style="text-align:right;vertical-align:top">
        <div style="color:#6b7280;font-size:10px;line-height:1.8;text-align:right">
          ${isFr ? 'Nigeria · Sénégal · RDC · Kenya<br>Ghana · Maroc' : 'Nigeria · Senegal · DRC · Kenya<br>Ghana · Morocco'}
        </div>
      </td>
    </tr></table>
    <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;padding-top:20px;text-align:center">
      <p style="margin:0;color:#4b5563;font-size:10px;line-height:1.8">
        ${isFr
          ? `Vous recevez cet email car vous êtes abonné(e) à la newsletter Vertex Group Africa.<br>
             <a href="https://vertexgroup.africa" style="color:#0c94d8;text-decoration:none">Se désabonner</a> · <a href="https://vertexgroup.africa" style="color:#0c94d8;text-decoration:none">Politique de confidentialité</a>`
          : `You are receiving this email because you subscribed to the Vertex Group Africa newsletter.<br>
             <a href="https://vertexgroup.africa" style="color:#0c94d8;text-decoration:none">Unsubscribe</a> · <a href="https://vertexgroup.africa" style="color:#0c94d8;text-decoration:none">Privacy policy</a>`}
      </p>
    </div>
  </div>

</div>
</body>
</html>`;
};

module.exports = { sendEmail, newLeadNotification, diagnosticConfirmation, newsletterConfirmation, diagnosticResults, buildNewsletterHtml };
