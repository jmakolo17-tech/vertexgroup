const router = require('express').Router();
const ctrl = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',           protect, ctrl.getClients);
router.get('/:id',        protect, ctrl.getClient);
router.post('/',          protect, authorize('super_admin', 'admin'), ctrl.createClient);
router.patch('/:id',      protect, ctrl.updateClient);
router.patch('/:id/kpis', protect, ctrl.updateKPIs);

module.exports = router;
