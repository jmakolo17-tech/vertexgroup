const router = require('express').Router();
const ctrl = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/auth');

// Public (website forms)
router.post('/contact', ctrl.submitContact);
router.post('/quote',   ctrl.submitQuote);

// Protected (dashboard)
router.get('/',          protect, ctrl.getLeads);
router.get('/:id',       protect, ctrl.getLead);
router.patch('/:id',     protect, ctrl.updateLead);
router.post('/:id/notes',protect, ctrl.addNote);
router.delete('/:id',    protect, authorize('super_admin', 'admin'), ctrl.archiveLead);

module.exports = router;
