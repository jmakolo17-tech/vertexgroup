const router      = require('express').Router();
const multer      = require('multer');
const ctrl        = require('../controllers/diagnosticController');
const upload      = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const formLimiter = require('../middleware/formLimiter');

// Wrap multer so its errors return clean JSON instead of crashing
function handleUpload(req, res, next) {
  upload.array('files', 3)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large — maximum 10 MB per file.'
        : err.code === 'LIMIT_FILE_COUNT'
        ? 'Too many files — maximum 3 files allowed.'
        : err.code === 'LIMIT_FIELD_VALUE'
        ? 'A text field is too large — please shorten your input.'
        : `Upload error: ${err.message}`;
      return res.status(400).json({ success: false, message: msg });
    }
    // fileFilter rejection or other error
    return res.status(400).json({ success: false, message: err.message || 'File upload failed.' });
  });
}

// Public (rate-limited)
router.post('/',          formLimiter, handleUpload, ctrl.submitDiagnostic);
router.get('/:id/result', ctrl.getDiagnosticResult);

// Protected
router.get('/',    protect, ctrl.getDiagnostics);
router.get('/:id', protect, ctrl.getDiagnostic);

module.exports = router;
