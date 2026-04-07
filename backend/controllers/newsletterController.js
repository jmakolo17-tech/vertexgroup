const Newsletter = require('../models/Newsletter');
const Notification = require('../models/Notification');
const { sendEmail, newsletterConfirmation } = require('../utils/email');

// POST /api/newsletter/subscribe (public)
exports.subscribe = async (req, res) => {
  try {
    const { email, name, language, country } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // Upsert — re-activate if previously unsubscribed
    const sub = await Newsletter.findOneAndUpdate(
      { email: email.toLowerCase() },
      { name, language: language || 'en', country, isActive: true, unsubscribedAt: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    sendEmail(newsletterConfirmation({ email, name }, language));

    await Notification.create({
      type: 'new_subscriber',
      title: `New newsletter subscriber — ${email}`,
      body: country ? `Country: ${country}` : undefined,
    });

    res.status(201).json({ success: true, message: 'Subscribed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/newsletter/unsubscribe (public)
exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;
    await Newsletter.findOneAndUpdate(
      { email: email?.toLowerCase() },
      { isActive: false, unsubscribedAt: new Date() }
    );
    res.json({ success: true, message: 'Unsubscribed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/newsletter (protected)
exports.getSubscribers = async (req, res) => {
  try {
    const { page = 1, limit = 50, active } = req.query;
    const filter = {};
    if (active !== undefined) filter.isActive = active === 'true';

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Newsletter.countDocuments(filter);
    const subscribers = await Newsletter.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), subscribers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
