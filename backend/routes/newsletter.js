const router = require('express').Router();
const ctrl = require('../controllers/newsletterController');
const { protect, authorize } = require('../middleware/auth');

router.post('/subscribe',   ctrl.subscribe);
router.post('/unsubscribe', ctrl.unsubscribe);
router.get('/',    protect, authorize('super_admin', 'admin'), ctrl.getSubscribers);
router.post('/send', protect, authorize('super_admin', 'admin'), ctrl.sendNewsletter);
router.delete('/:id', protect, authorize('super_admin', 'admin'), ctrl.deleteSubscriber);

module.exports = router;
