const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

// POST /api/email/send — send an ad-hoc email from the dashboard compose section
router.post('/send', protect, async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, message: 'To, subject, and body are required.' });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ success: false, message: 'Invalid recipient email address.' });
    }

    const result = await sendEmail({
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]+>/g, '').replace(/\n+/g, '\n').trim(),
    });

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
