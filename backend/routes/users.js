const router = require('express').Router();
const User   = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// GET /api/users — list team members
router.get('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users — create team member
router.post('/', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { name, email, password, role, countries } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password required' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });

    const user = await User.create({ name, email, password, role, countries });
    res.status(201).json({ success: true, user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/users/:id
router.patch('/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { name, role, countries, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, role, countries, isActive },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
