/**
 * Subida y descarga de archivos por workspace (MVP: disco local → migrable a S3).
 * La celda tipo "file" guarda { url, filename, mimeType, size, extension }.
 */

import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';
import {
  UPLOAD_ROOT,
  MAX_BYTES,
  ALLOWED_MIME,
  workspaceDir,
  resolvePublicFileUrl,
} from '../services/workspaceUploadStorage.js';

const log = logger.child('WorkspaceUpload');

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      cb(null, workspaceDir(req.params.workspaceId));
    } catch (e) {
      cb(e);
    }
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').slice(0, 12).toLowerCase() || '.bin';
    const safeExt = /^\.[a-z0-9]+$/i.test(ext) ? ext : '.bin';
    cb(null, `${uuidv4()}${safeExt}`);
  },
});

export const uploadWorkspaceMiddleware = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('INVALID_FILE_TYPE'));
  },
}).single('file');

/**
 * POST /api/workspace/:workspaceId/upload
 * multipart field name: file
 */
export function uploadFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo requerido (campo file)' });
  }
  const { workspaceId } = req.params;
  const storedName = req.file.filename;
  const extension = path.extname(storedName).replace(/^\./, '') || '';
  const relPath = `/api/workspace/${workspaceId}/uploads/${encodeURIComponent(storedName)}`;
  const url = resolvePublicFileUrl(relPath);

  log.debug('Uploaded', { workspaceId, storedName, size: req.file.size });

  return res.json({
    url,
    filename: req.file.originalname || storedName,
    mimeType: req.file.mimetype,
    size: req.file.size,
    extension,
    storedName,
  });
}

const EXT_MIME = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * GET /api/workspace/:workspaceId/uploads/:fileName
 */
export function downloadFile(req, res) {
  const { workspaceId, fileName } = req.params;
  const safeName = path.basename(fileName || '');
  if (!safeName || safeName !== fileName) {
    return res.status(400).json({ error: 'Nombre inválido' });
  }

  const base = path.resolve(path.join(UPLOAD_ROOT, workspaceId));
  const full = path.resolve(path.join(base, safeName));

  if (!full.startsWith(base)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (!fs.existsSync(full)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  const ext = path.extname(safeName).toLowerCase();
  const mime = EXT_MIME[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.sendFile(full);
}

export function wrapUpload(handler) {
  return (req, res, next) => {
    uploadWorkspaceMiddleware(req, res, (err) => {
      if (err) {
        if (err.message === 'INVALID_FILE_TYPE') {
          return res.status(400).json({ error: 'Tipo de archivo no permitido' });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: `Archivo demasiado grande (máx. ${Math.round(MAX_BYTES / 1024 / 1024)} MB)` });
        }
        log.warn('Upload error', { error: err.message });
        return res.status(400).json({ error: err.message || 'Error al subir' });
      }
      return handler(req, res, next);
    });
  };
}
