import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BadRequestError } from '../utils/errors';

const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
    const safeName = `hotel_logo_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, safeName);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(new BadRequestError('Invalid file type. Only PNG, JPG, and WEBP are allowed.'));
    return;
  }
  cb(null, true);
};

export const uploadLogo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
});
