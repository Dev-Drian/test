/**
 * Almacenamiento de archivos por workspace (compartido: API multipart + canales Meta/Telegram).
 */
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

const log = logger.child('WorkspaceUploadStorage');

/** Origen público del API (sin barra final), p. ej. https://api.tudominio.com — para URLs guardadas en celdas y Meta. */
const APP_PUBLIC_URL = String(process.env.APP_PUBLIC_URL || '')
  .trim()
  .replace(/\/$/, '');

export const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
export const MAX_BYTES =
  parseInt(process.env.UPLOAD_MAX_BYTES || String(15 * 1024 * 1024), 10) || 15 * 1024 * 1024;

export const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export function workspaceDir(workspaceId) {
  const dir = path.join(UPLOAD_ROOT, workspaceId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Ruta interna siempre /api/workspace/... Si APP_PUBLIC_URL está definida, URL absoluta para enlaces externos (WhatsApp, etc.).
 * @param {string} relPath - Debe empezar por /
 */
export function resolvePublicFileUrl(relPath) {
  if (!relPath || typeof relPath !== 'string') return relPath;
  if (!relPath.startsWith('/')) return relPath;
  if (!APP_PUBLIC_URL) return relPath;
  return `${APP_PUBLIC_URL}${relPath}`;
}

/**
 * @param {object} opts
 * @param {string} opts.workspaceId
 * @param {Buffer} opts.buffer
 * @param {string} [opts.originalFilename]
 * @param {string} opts.mimeType
 * @returns {{ url: string, filename: string, mimeType: string, size: number, extension: string, storedName: string }}
 */
export function saveBufferToWorkspace({ workspaceId, buffer, originalFilename = 'archivo', mimeType }) {
  if (!workspaceId || !buffer?.length) {
    throw new Error('INVALID_UPLOAD');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
  const mt = String(mimeType || '').split(';')[0].trim();
  if (!ALLOWED_MIME.has(mt)) {
    throw new Error('INVALID_FILE_TYPE');
  }

  let ext = path.extname(originalFilename || '').slice(0, 12).toLowerCase();
  if (!ext || ext === '.' || !/^\.[a-z0-9]+$/i.test(ext)) {
    ext = MIME_TO_EXT[mt] || '.bin';
  }
  const safeExt = /^\.[a-z0-9]+$/i.test(ext) ? ext : '.bin';
  const storedName = `${uuidv4()}${safeExt}`;
  const dir = workspaceDir(workspaceId);
  const full = path.join(dir, storedName);
  fs.writeFileSync(full, buffer);

  const relPath = `/api/workspace/${workspaceId}/uploads/${encodeURIComponent(storedName)}`;
  const url = resolvePublicFileUrl(relPath);
  const extension = safeExt.replace(/^\./, '') || '';

  log.debug('saveBufferToWorkspace', { workspaceId, storedName, size: buffer.length, mimeType: mt });

  return {
    url,
    filename: originalFilename || storedName,
    mimeType: mt,
    size: buffer.length,
    extension,
    storedName,
  };
}
