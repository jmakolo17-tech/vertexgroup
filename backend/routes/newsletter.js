const router = require('express').Router();
const ctrl = require('../controllers/newsletterController');
const { protect, authorize } = require('../middleware/auth');

router.post('/subscribe',   ctrl.subscribe);
router.post('/unsubscribe', ctrl.unsubscribe);
router.get('/', protect, authorize('super_admin', 'admin'), ctrl.getSubscribers);

module.exports = router;
