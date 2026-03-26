/**
 * Widget API — Cliente HTTP para los endpoints públicos del widget.
 * NO usa el interceptor JWT de client.js (el widget es anónimo).
 */

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const widgetApi = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export const getWidgetConfig = (token) =>
  widgetApi.get(`/widget/${token}/config`);

export const createWidgetSession = (token, visitorId) =>
  widgetApi.post(`/widget/${token}/session`, { visitorId });

export const sendWidgetMessage = (token, { visitorId, chatId, message }) =>
  widgetApi.post(`/widget/${token}/message`, { visitorId, chatId, message });

export const getWidgetHistory = (token, visitorId, limit = 50) =>
  widgetApi.get(`/widget/${token}/history/${visitorId}`, { params: { limit } });
