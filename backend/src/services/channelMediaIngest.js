/**
 * Descarga de adjuntos desde Meta (WhatsApp Cloud API, URLs de Messenger/IG) y Telegram.
 */
import axios from 'axios';
import fetch from 'node-fetch';
import path from 'path';
import logger from '../config/logger.js';
import { MAX_BYTES, saveBufferToWorkspace, ALLOWED_MIME } from './workspaceUploadStorage.js';

const log = logger.child('ChannelMediaIngest');

const META_GRAPH_URL = process.env.META_GRAPH_API_URL || 'https://graph.facebook.com/v19.0';
const TELEGRAM_API = 'https://api.telegram.org/bot';

const EXT_MIME_FALLBACK = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * WhatsApp: GET media metadata → GET bytes con Bearer.
 */
export async function downloadWhatsAppMedia(mediaId, accessToken) {
  const metaRes = await axios.get(`${META_GRAPH_URL}/${mediaId}`, {
    params: { access_token: accessToken },
    timeout: 30000,
  });
  const { url, mime_type: mimeType, file_size: fileSize } = metaRes.data || {};
  if (!url) {
    throw new Error('WA_MEDIA_NO_URL');
  }
  if (fileSize && fileSize > MAX_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
  const fileRes = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: 'arraybuffer',
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
    timeout: 60000,
  });
  const buffer = Buffer.from(fileRes.data);
  const mt = mimeType || fileRes.headers['content-type']?.split(';')[0]?.trim() || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mt)) {
    throw new Error('INVALID_FILE_TYPE');
  }
  return { buffer, mimeType: mt };
}

/**
 * Messenger / Instagram: URL firmada en payload.
 */
export async function downloadMetaAttachmentUrl(fileUrl, hintMime) {
  const res = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
    timeout: 60000,
  });
  const buffer = Buffer.from(res.data);
  let mime =
    res.headers['content-type']?.split(';')[0]?.trim() ||
    hintMime ||
    'application/octet-stream';
  if (mime === 'application/octet-stream' && hintMime) {
    mime = hintMime;
  }
  if (!ALLOWED_MIME.has(mime)) {
    let ext = '';
    try {
      ext = path.extname(new URL(fileUrl).pathname || '').toLowerCase();
    } catch {
      ext = '';
    }
    const fallback = EXT_MIME_FALLBACK[ext];
    if (fallback && ALLOWED_MIME.has(fallback)) {
      mime = fallback;
    }
  }
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error('INVALID_FILE_TYPE');
  }
  return { buffer, mimeType: mime };
}

export function hintMimeForAttachmentType(attType) {
  if (attType === 'image') return 'image/jpeg';
  if (attType === 'file') return 'application/pdf';
  return null;
}

/**
 * Telegram Bot API: getFile → descarga por HTTPS.
 */
export async function downloadTelegramFile(botToken, fileId) {
  const metaUrl = `${TELEGRAM_API}${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`;
  const metaRes = await fetch(metaUrl);
  const metaJson = await metaRes.json();
  if (!metaJson.ok || !metaJson.result?.file_path) {
    throw new Error(metaJson.description || 'TELEGRAM_GETFILE_FAILED');
  }
  const filePath = metaJson.result.file_path;
  const binUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const binRes = await fetch(binUrl);
  if (!binRes.ok) {
    throw new Error(`TELEGRAM_DOWNLOAD_${binRes.status}`);
  }
  const ab = await binRes.arrayBuffer();
  const buffer = Buffer.from(ab);
  if (buffer.length > MAX_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
  const ext = path.extname(filePath).toLowerCase();
  let mimeType = EXT_MIME_FALLBACK[ext] || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error('INVALID_FILE_TYPE');
  }
  return { buffer, mimeType, filePath };
}

/**
 * Descarga + guarda en disco del workspace. Devuelve el objeto celda "file" o null si falla.
 */
export async function ingestWhatsAppMediaToWorkspace({ workspaceId, mediaId, accessToken, originalFilename }) {
  try {
    const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId, accessToken);
    return saveBufferToWorkspace({
      workspaceId,
      buffer,
      originalFilename: originalFilename || 'archivo',
      mimeType,
    });
  } catch (err) {
    log.warn('ingestWhatsAppMediaToWorkspace failed', { workspaceId, error: err.message });
    return null;
  }
}

export async function ingestUrlToWorkspace({ workspaceId, url, originalFilename, hintMime }) {
  try {
    const { buffer, mimeType } = await downloadMetaAttachmentUrl(url, hintMime);
    return saveBufferToWorkspace({
      workspaceId,
      buffer,
      originalFilename: originalFilename || 'archivo',
      mimeType,
    });
  } catch (err) {
    log.warn('ingestUrlToWorkspace failed', { workspaceId, error: err.message });
    return null;
  }
}

export async function ingestTelegramFileToWorkspace({ workspaceId, botToken, fileId, originalFilename }) {
  try {
    const { buffer, mimeType } = await downloadTelegramFile(botToken, fileId);
    return saveBufferToWorkspace({
      workspaceId,
      buffer,
      originalFilename: originalFilename || 'archivo',
      mimeType,
    });
  } catch (err) {
    log.warn('ingestTelegramFileToWorkspace failed', { workspaceId, error: err.message });
    return null;
  }
}
