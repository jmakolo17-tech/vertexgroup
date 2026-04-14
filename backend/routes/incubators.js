const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const ctrl     = require('../controllers/incubatorController');
const { protect } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const ok = /xlsx|xls|csv/.test(file.originalname.split('.').pop().toLowerCase());
    cb(ok ? null : new Error('Only .xlsx, .xls, .csv files are allowed.'), ok);
  },
});

router.get('/entrepreneurs',          protect, ctrl.getEntrepreneurs);
router.post('/entrepreneurs',         protect, ctrl.addEntrepreneur);
router.patch('/entrepreneurs/:id',    protect, ctrl.updateEntrepreneur);
router.delete('/entrepreneurs/:id',   protect, ctrl.deleteEntrepreneur);
router.get('/analytics',              protect, ctrl.getAnalytics);
router.get('/duplicates',             protect, ctrl.getDuplicates);
router.post('/upload',                protect, upload.single('file'), ctrl.uploadExcel);
router.get('/export',                 protect, ctrl.exportXLSX);

module.exports = router;
