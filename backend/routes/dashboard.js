const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/stats',                      protect, ctrl.getStats);
router.get('/notifications',              protect, ctrl.getNotifications);
router.patch('/notifications/read-all',   protect, ctrl.markAllRead);
router.patch('/notifications/:id/read',   protect, ctrl.markOneRead);

module.exports = router;
