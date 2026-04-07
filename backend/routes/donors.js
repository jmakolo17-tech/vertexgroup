const router = require('express').Router();
const ctrl   = require('../controllers/donorController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',    protect, ctrl.getDonors);
router.get('/:id', protect, ctrl.getDonor);
router.post('/',   protect, authorize('super_admin', 'admin'), ctrl.createDonor);
router.patch('/:id', protect, authorize('super_admin', 'admin'), ctrl.updateDonor);
router.delete('/:id', protect, authorize('super_admin'), ctrl.deleteDonor);

// SME engagements
router.post('/:id/sme',              protect, authorize('super_admin', 'admin'), ctrl.addSME);
router.patch('/:id/sme/:smeId',      protect, authorize('super_admin', 'admin'), ctrl.updateSME);
router.delete('/:id/sme/:smeId',     protect, authorize('super_admin'), ctrl.deleteSME);

module.exports = router;
