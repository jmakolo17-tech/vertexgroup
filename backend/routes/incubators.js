const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const ctrl     = require('../controllers/incubatorController');
const { protect } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const ext  = file.originalname.split('.').pop().toLowerCase();
    const mime = file.mimetype || '';
    const ok   = /^(xlsx|xls|csv|ods|numbers|tsv|dbf|pdf)$/.test(ext)
              || mime === 'application/pdf'
              || mime.includes('spreadsheet')
              || mime.includes('excel')
              || mime === 'text/csv';
    cb(ok ? null : new Error('Unsupported file. Accepted: xlsx, xls, csv, ods, numbers, tsv, pdf'), ok);
  },
});

router.get('/entrepreneurs',          protect, ctrl.getEntrepreneurs);
router.post('/entrepreneurs',         protect, ctrl.addEntrepreneur);
router.patch('/entrepreneurs/:id',    protect, ctrl.updateEntrepreneur);
router.delete('/entrepreneurs/:id',   protect, ctrl.deleteEntrepreneur);
router.get('/analytics',              protect, ctrl.getAnalytics);
router.get('/duplicates',             protect, ctrl.getDuplicates);
router.post('/upload',                protect, upload.single('file'), ctrl.uploadFile);
router.get('/export',                 protect, ctrl.exportXLSX);

module.exports = router;
