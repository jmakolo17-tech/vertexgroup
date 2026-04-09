const router  = require('express').Router();
const multer  = require('multer');
const { protect } = require('../middleware/auth');
const { sendEmail, buildDashboardEmailHtml } = require('../utils/email');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// POST /api/email/send — ad-hoc email from dashboard compose, supports attachments
router.post('/send', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, message: 'To, subject, and body are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ success: false, message: 'Invalid recipient email address.' });
    }

    // Wrap body in branded template
    const html = buildDashboardEmailHtml({ subject, bodyHtml: body, senderName: req.user?.name });

    // Map uploaded files to nodemailer attachment objects
    const attachments = (req.files || []).map(f => ({
      filename:    f.originalname,
      content:     f.buffer,
      contentType: f.mimetype,
    }));

    const result = await sendEmail({ to, subject, html, attachments });

    if (result.success) {
      res.json({ success: true, message: 'Email sent successfully.' });
    } else {
      res.status(500).json({ success: false, message: result.error || 'Failed to send email.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
