import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import api, { inboundRouter } from "./routers/index.js";
import logger from "./config/logger.js";
import cache from "./config/cache.js";
import { getCronScheduler } from "./jobs/CronScheduler.js";
import { getSocketService } from "./realtime/SocketService.js";

const app = express();
const PORT = process.env.PORT || 3010;
const HOST = process.env.HOST || '0.0.0.0';

// CORS origins (para Express y Socket.io)
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3020', 'http://localhost:5173', 'http://localhost:5174'];

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/api", api);
app.use("/inbound", inboundRouter);

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

// ─── HTTP Server + Socket.io ─────────────────────────────────────────────────
const httpServer = http.createServer(app);

// Inicializar Socket.io sobre el mismo servidor HTTP
getSocketService().init(httpServer, corsOrigins);

httpServer.listen(PORT, HOST, () => {
  logger.info(`🚀 Backend running on http://${HOST}:${PORT}`);
  logger.info(`🔌 Socket.io listo en ws://${HOST}:${PORT}`);
  getCronScheduler().init().catch(err =>
    logger.warn('CronScheduler init failed', { error: err.message })
  );
});
