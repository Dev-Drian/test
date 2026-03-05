/**
 * Admin - Super Admin Panel
 *
 * Panel de observabilidad del sistema para super administradores.
 * Muestra: estado del sistema, jobs activos, snapshots en cache, y permite
 * ejecutar acciones de mantenimiento.
 *
 * Buenas prácticas:
 *   - Auto-refresh cada 30s con contador regresivo visible
 *   - Skeleton loading en primera carga
 *   - Acciones con confirmación y feedback de toast
 *   - Diseño modular: cada sección es independiente
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "../components/Toast";
import {
  getAdminStatus,
  getAdminJobs,
  getAdminSnapshots,
  invalidateAdminSnapshot,
  clearAdminCache,
  reloadAdminJobs,
} from "../api/client";

// ─── Helpers ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30; // segundos

function StatusBadge({ ok, label }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
        border: `1px solid ${ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
        color: ok ? "#34d399" : "#f87171",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: ok ? "#34d399" : "#f87171" }}
      />
      {label}
    </span>
  );
}

function MetricCard({ icon, label, value, sub, accent = "#8b5cf6" }) {
  return (
    <div
      className="p-4 rounded-2xl flex flex-col gap-1"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: accent }}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{children}</h2>
      {action}
    </div>
  );
}

function ActionButton({ onClick, loading, children, variant = "default" }) {
  const variants = {
    default: {
      background: "rgba(139,92,246,0.15)",
      border: "1px solid rgba(139,92,246,0.3)",
      color: "#c4b5fd",
    },
    danger: {
      background: "rgba(239,68,68,0.12)",
      border: "1px solid rgba(239,68,68,0.25)",
      color: "#f87171",
    },
    success: {
      background: "rgba(16,185,129,0.12)",
      border: "1px solid rgba(16,185,129,0.25)",
      color: "#34d399",
    },
  };
  const style = variants[variant] || variants.default;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
      style={style}
    >
      {loading ? "⏳ Cargando..." : children}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Admin() {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [snapshots, setSnapshots] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [actionLoading, setActionLoading] = useState({});
  const countdownRef = useRef(null);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [statusRes, jobsRes, snapshotsRes] = await Promise.allSettled([
        getAdminStatus(),
        getAdminJobs(),
        getAdminSnapshots(),
      ]);
      if (statusRes.status === "fulfilled") setStatus(statusRes.value.data);
      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.data);
      if (snapshotsRes.status === "fulfilled") setSnapshots(snapshotsRes.value.data);
    } catch (err) {
      toast.error("Error al cargar estado del sistema");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCountdown(REFRESH_INTERVAL);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const interval = setInterval(() => fetchAll(true), REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Countdown display
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return REFRESH_INTERVAL;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const withAction = async (key, fn, successMsg) => {
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      await fn();
      toast.success(successMsg);
      await fetchAll(true);
    } catch (err) {
      toast.error("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleClearCache = () =>
    withAction("clearCache", () => clearAdminCache(), "Cache limpiada correctamente");

  const handleReloadJobs = () =>
    withAction("reloadJobs", () => reloadAdminJobs(), "Jobs recargados desde la BD");

  const handleInvalidateSnapshot = (workspaceId) =>
    withAction(`snapshot_${workspaceId}`, () => invalidateAdminSnapshot(workspaceId), `Snapshot de ${workspaceId} invalidado`);

  // ─── Render ───────────────────────────────────────────────────────────────

  const pageStyle = {
    background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)",
    minHeight: "100%",
  };

  if (loading) {
    return (
      <div className="p-8" style={pageStyle}>
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-12 overflow-y-auto" style={pageStyle}>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">⚙️ Super Admin</h1>
            <p className="text-sm text-slate-500">
              Observabilidad del sistema · actualizado hace <span className="text-slate-400 font-medium">{REFRESH_INTERVAL - countdown}s</span>
              <span className="ml-2 text-slate-600">· próximo refresh en {countdown}s</span>
            </p>
          </div>
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}
          >
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>

        {/* ── System Status ────────────────────────────────── */}
        <section>
          <SectionTitle>Estado del sistema</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <MetricCard icon="🕐" label="Uptime" value={status ? `${Math.floor(status.system.uptime / 60)}m` : "—"} sub={`${status?.system.uptime ?? 0}s total`} accent="#8b5cf6" />
            <MetricCard icon="💾" label="Memoria" value={status ? `${status.system.memoryMB} MB` : "—"} sub="RSS process" accent="#6366f1" />
            <MetricCard icon="⏰" label="Jobs activos" value={status?.scheduler.activeJobs ?? "—"} sub="Cron jobs" accent="#10b981" />
            <MetricCard icon="🗄" label="Cache keys" value={status?.cache.totalKeys ?? "—"} sub={`${status?.cache.snapshotsCached ?? 0} snapshots`} accent="#f59e0b" />
          </div>

          <div className="flex flex-wrap gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <StatusBadge ok={status?.database.ok} label={status?.database.ok ? "Base de datos OK" : `BD error: ${status?.database.error}`} />
            <StatusBadge ok={status?.scheduler.initialized} label={status?.scheduler.initialized ? "Scheduler activo" : "Scheduler inactivo"} />
            <StatusBadge ok={status?.openai.configured} label={status?.openai.configured ? "OpenAI configurado" : "Sin OpenAI key"} />
            <span className="text-xs text-slate-600 self-center ml-auto">Node {status?.system.nodeVersion} · {status?.system.environment}</span>
          </div>
        </section>

        {/* ── Cron Jobs ────────────────────────────────────── */}
        <section>
          <SectionTitle
            action={
              <ActionButton onClick={handleReloadJobs} loading={actionLoading.reloadJobs} variant="success">
                🔄 Recargar jobs
              </ActionButton>
            }
          >
            Cron Jobs activos
          </SectionTitle>

          {jobs?.jobCount === 0 ? (
            <div className="p-6 text-center rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-slate-500 text-sm">No hay cron jobs activos.</p>
              <p className="text-slate-600 text-xs mt-1">Los jobs se registran cuando se crean flujos con trigger de tiempo.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(51,65,85,0.5)" }}>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs uppercase tracking-wide">Job ID</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs uppercase tracking-wide">Workspace</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs uppercase tracking-wide">Flow</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs?.jobs?.map((job, i) => (
                    <tr key={job.id} style={{ borderTop: "1px solid rgba(100,116,139,0.1)" }}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 truncate max-w-32">{job.id}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs truncate max-w-32">{job.workspaceId || "—"}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs truncate max-w-32">{job.flowId || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge ok={job.running !== false} label={job.status || "scheduled"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Snapshot Cache ───────────────────────────────── */}
        <section>
          <SectionTitle
            action={
              <ActionButton onClick={handleClearCache} loading={actionLoading.clearCache} variant="danger">
                🗑 Limpiar cache completa
              </ActionButton>
            }
          >
            Snapshot cache por workspace
          </SectionTitle>

          {!snapshots?.count ? (
            <div className="p-6 text-center rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-slate-500 text-sm">No hay snapshots en cache.</p>
              <p className="text-slate-600 text-xs mt-1">Los snapshots se generan automáticamente cuando el bot consulta el estado del negocio.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(51,65,85,0.5)" }}>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs uppercase tracking-wide">Workspace ID</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs uppercase tracking-wide">Expira en</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium text-xs uppercase tracking-wide">Vence</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium text-xs uppercase tracking-wide">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots?.snapshots?.map((snap) => {
                    const urgent = snap.ttlRemainingSeconds !== null && snap.ttlRemainingSeconds < 60;
                    return (
                      <tr key={snap.workspaceId} style={{ borderTop: "1px solid rgba(100,116,139,0.1)" }}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate max-w-48">{snap.workspaceId}</td>
                        <td className="px-4 py-3 text-xs">
                          {snap.ttlRemainingSeconds !== null ? (
                            <span className={urgent ? "text-amber-400" : "text-emerald-400"}>
                              {snap.ttlRemainingSeconds}s
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {snap.expiresAt ? new Date(snap.expiresAt).toLocaleTimeString("es-CO") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ActionButton
                            onClick={() => handleInvalidateSnapshot(snap.workspaceId)}
                            loading={actionLoading[`snapshot_${snap.workspaceId}`]}
                            variant="danger"
                          >
                            Invalidar
                          </ActionButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Quick Reference ──────────────────────────────── */}
        <section>
          <SectionTitle>Endpoints disponibles</SectionTitle>
          <div className="grid gap-2">
            {[
              { method: "GET", path: "/api/admin/status", desc: "Estado del sistema" },
              { method: "GET", path: "/api/admin/jobs", desc: "Lista de cron jobs" },
              { method: "POST", path: "/api/admin/jobs/reload", desc: "Recarga jobs desde BD" },
              { method: "GET", path: "/api/admin/snapshots", desc: "Cache de snapshots" },
              { method: "DELETE", path: "/api/admin/snapshots/:wId", desc: "Invalida snapshot de workspace" },
              { method: "POST", path: "/api/admin/cache/clear", desc: "Limpia toda la cache" },
              { method: "GET", path: "/api/admin/snapshot/:wId?force=true", desc: "Fuerza regeneración de snapshot" },
            ].map(({ method, path, desc }) => (
              <div key={path} className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.02)" }}>
                <span
                  className="font-mono font-bold shrink-0 w-12"
                  style={{ color: method === "GET" ? "#34d399" : method === "POST" ? "#60a5fa" : "#f87171" }}
                >
                  {method}
                </span>
                <span className="font-mono text-slate-400 truncate flex-1">{path}</span>
                <span className="text-slate-500 shrink-0">{desc}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
