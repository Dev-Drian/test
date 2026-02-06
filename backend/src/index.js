import "dotenv/config";
import express from "express";
import cors from "cors";
import api from "./routers/index.js";

const app = express();
const PORT = process.env.PORT || 3010;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", api);

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "migracion-backend" });
});

app.listen(PORT, () => {
  console.log(`Migracion backend running on http://localhost:${PORT}`);
});
