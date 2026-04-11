const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/formController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many submissions — please try again later.' },
});

// ── Public routes (no auth) ───────────────────────────────────────────────────
router.get('/public/:slug',        ctrl.getPublicForm);
router.post('/public/:slug/submit', publicLimiter, ctrl.submitForm);

// ── Admin routes (protected) ──────────────────────────────────────────────────
router.get('/',                       protect, ctrl.getForms);
router.post('/',                      protect, ctrl.createForm);
router.get('/:id',                    protect, ctrl.getForm);
router.patch('/:id',                  protect, ctrl.updateForm);
router.delete('/:id',                 protect, ctrl.deleteForm);
router.get('/:id/submissions',        protect, ctrl.getSubmissions);
router.get('/:id/submissions/export', protect, ctrl.exportSubmissions);

module.exports = router;
