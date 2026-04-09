const router          = require('express').Router();
const ctrl            = require('../controllers/insightsController');
const { protect }     = require('../middleware/auth');

router.get('/analytics',   protect, ctrl.getAnalytics);
router.get('/diagnostics', protect, ctrl.getDiagnostics);
router.get('/demand',      protect, ctrl.getDemand);
router.get('/export',      protect, ctrl.exportCSV);

module.exports = router;
