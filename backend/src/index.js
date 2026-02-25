import "dotenv/config";
import express from "express";
import cors from "cors";
import api from "./routers/index.js";
import logger from "./config/logger.js";
import cache from "./config/cache.js";

const app = express();
const PORT = process.env.PORT || 3010;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", api);

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

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  logger.info(`🚀 Migracion backend running on http://${HOST}:${PORT}`);
});
