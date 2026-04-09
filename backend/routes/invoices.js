const router = require('express').Router();
const ctrl   = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',              protect, ctrl.getInvoices);
router.get('/:id',           protect, ctrl.getInvoice);
router.post('/',             protect, authorize('super_admin','admin'), ctrl.createInvoice);
router.patch('/:id',         protect, authorize('super_admin','admin'), ctrl.updateInvoice);
router.post('/:id/send',     protect, authorize('super_admin','admin'), ctrl.sendInvoice);
router.patch('/:id/status',  protect, authorize('super_admin','admin'), ctrl.updateStatus);
router.delete('/:id',        protect, authorize('super_admin','admin'), ctrl.deleteInvoice);

module.exports = router;
