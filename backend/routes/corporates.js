const router = require('express').Router();
const ctrl   = require('../controllers/corporateController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',    protect, ctrl.getCorporates);
router.get('/:id', protect, ctrl.getCorporate);
router.post('/',   protect, authorize('super_admin', 'admin'), ctrl.createCorporate);
router.patch('/:id', protect, authorize('super_admin', 'admin'), ctrl.updateCorporate);
router.delete('/:id', protect, authorize('super_admin'), ctrl.deleteCorporate);

module.exports = router;
