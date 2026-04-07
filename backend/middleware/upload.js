const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowed.test(ext)) return cb(null, true);
  cb(new Error(`File type .${ext} not allowed`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize:  10 * 1024 * 1024, // 10 MB per file
    fieldSize: 5  * 1024 * 1024, // 5 MB per text field (covers long challenge/goals text)
    files: 3,
  },
});

module.exports = upload;
