const router      = require('express').Router();
const ctrl        = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/auth');
const formLimiter = require('../middleware/formLimiter');

// Public (website forms — rate-limited)
router.post('/contact', formLimiter, ctrl.submitContact);
router.post('/quote',   formLimiter, ctrl.submitQuote);

// Protected (dashboard)
router.post('/',         protect, ctrl.createLead);
router.get('/',          protect, ctrl.getLeads);
router.get('/:id',       protect, ctrl.getLead);
router.patch('/:id',     protect, ctrl.updateLead);
router.post('/:id/notes',protect, ctrl.addNote);
router.delete('/:id',    protect, authorize('super_admin', 'admin'), ctrl.archiveLead);

module.exports = router;
