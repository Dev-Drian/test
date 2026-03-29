import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import compression from "compression";
import api, { inboundRouter } from "./routers/index.js";
import logger from "./config/logger.js";
import cache from "./config/cache.js";
import { getCronScheduler } from "./jobs/CronScheduler.js";
import { getSocketService } from "./realtime/SocketService.js";
import { handlePaymentSuccess } from "./controllers/paymentController.js";
import { sanitizeBody } from "./utils/sanitize.js";
import httpLogger from "./middleware/httpLogger.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { initRedis, startMetaMessageWorker, closeMetaMessageQueue, closeRedis, getQueueStats } from "./queues/index.js";

const app = express();
const PORT = process.env.PORT || 3010;
const HOST = process.env.HOST || '0.0.0.0';

// CORS origins (para Express y Socket.io)
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3020', 'http://localhost:5173', 'http://localhost:5174'];

app.use(cors({ origin: corsOrigins, credentials: true }));

// Compresión HTTP (gzip/deflate) - reduce tamaño de respuestas ~70%
app.use(compression({
  level: 6,
  threshold: 1024, // comprimir respuestas > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Rate limiting global para /api (100 req/min por IP)
app.use('/api', apiLimiter);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
// Sanitizar inputs para prevenir XSS
app.use(sanitizeBody({ escapeHtml: false }));
// Logging HTTP estructurado
app.use(httpLogger);

app.use("/api", api);
app.use("/inbound", inboundRouter);

// Redirect de Wompi después del pago (sin prefijo /api)
app.get("/payment/success", handlePaymentSuccess);

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "migracion-backend" });
});

// Endpoint para estadísticas de cache
app.get("/api/cache/stats", (req, res) => {
  res.json(cache.getStats());
});

// Endpoint para limpiar cache
app.post("/api/cache/clear", (req, res) => {
  cache.flush();
  res.json({ success: true, message: 'Cache cleared' });
});

// Endpoint para estadísticas de cola de mensajes
app.get("/api/queues/stats", async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (err) {
    res.json({ available: false, error: err.message });
  }
});

// ─── HTTP Server + Socket.io ─────────────────────────────────────────────────
const httpServer = http.createServer(app);

// Inicializar Socket.io sobre el mismo servidor HTTP
getSocketService().init(httpServer, corsOrigins);

httpServer.listen(PORT, HOST, async () => {
  logger.info(`🚀 Backend running on http://${HOST}:${PORT}`);
  logger.info(`🔌 Socket.io listo en ws://${HOST}:${PORT}`);
  
  // Inicializar CronScheduler
  getCronScheduler().init().catch(err =>
    logger.warn('CronScheduler init failed', { error: err.message })
  );
  
  // Inicializar Redis y worker de mensajes (si está disponible)
  const redisOk = await initRedis();
  if (redisOk) {
    startMetaMessageWorker();
    logger.info('📬 Sistema de colas activo');
  } else {
    logger.info('📭 Sin Redis — Procesamiento directo de mensajes');
  }
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} recibido — Cerrando servidor...`);
  
  // Cerrar cola de mensajes
  await closeMetaMessageQueue().catch(() => {});
  await closeRedis().catch(() => {});
  
  // Cerrar servidor HTTP
  httpServer.close(() => {
    logger.info('Servidor cerrado correctamente');
    process.exit(0);
  });
  
  // Forzar cierre después de 10s
  setTimeout(() => {
    logger.warn('Cierre forzado después de timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
