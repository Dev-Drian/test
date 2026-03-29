/**
 * Paneles del Centro de Conversaciones: nueva conversación + contexto (tipo + tablas).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, Bot, Database, Sparkles, ExternalLink } from "lucide-react";
import { listTables, getTableData } from "../../api/client";

const CONTACT_HINT = /contacto|cliente|customer|lead|persona|paciente|usuario|prospecto/i;
const SAMPLE_HINT = /ejemplo|sample|demo|test|prueba|plantilla|template/i;

function scoreContactsTable(t) {
  const n = (t.name || "").toLowerCase();
  let s = 0;
  if (CONTACT_HINT.test(n)) s += 12;
  if (SAMPLE_HINT.test(n)) s -= 4;
  return s;
}

function scoreSampleTable(t) {
  const n = (t.name || "").toLowerCase();
  let s = 0;
  if (SAMPLE_HINT.test(n)) s += 12;
  if (CONTACT_HINT.test(n)) s -= 3;
  return s;
}

function pickTable(tables, scorer) {
  if (!tables?.length) return null;
  const ranked = [...tables].map((t) => ({ t, s: scorer(t) }));
  ranked.sort((a, b) => b.s - a.s);
  return ranked[0]?.t || tables[0];
}

const META_KEYS = new Set(["_id", "_rev", "tableId", "type", "createdAt", "updatedAt", "main"]);

function rowPreview(row, keys, max = 4) {
  const k = keys.filter((key) => !META_KEYS.has(key)).slice(0, max);
  return k.map((key) => ({
    key,
    val: row[key] != null && row[key] !== "" ? String(row[key]).slice(0, 48) : "—",
  }));
}

export function NewConversationModal({
  open,
  onClose,
  agents,
  selectedAgentId,
  onAgentChange,
  onCreateWeb,
  creating,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-conv-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12121c] shadow-2xl shadow-violet-950/40 overflow-hidden"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 id="new-conv-title" className="text-lg font-semibold text-white tracking-tight">
              Nueva conversación
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chat del bot en web o panel
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-xl border border-violet-500/35 bg-violet-500/[0.08] p-4 ring-1 ring-violet-500/15">
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400/90 mb-2 flex items-center gap-2">
              <Bot className="w-3.5 h-3.5" />
              Agente
            </p>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Crea una conversación nueva para hablar con el bot (widget o este panel).
            </p>
            {agents.length > 1 && (
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Seleccionar agente
              </label>
            )}
            {agents.length > 1 && (
              <select
                value={selectedAgentId}
                onChange={(e) => onAgentChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-200 bg-black/30 border border-white/10 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/30 mb-3"
              >
                <option value="">Seleccionar…</option>
                {agents.map((a) => (
                  <option key={a._id} value={a._id} className="bg-slate-900">
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={creating || !selectedAgentId}
                onClick={onCreateWeb}
                className="flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                  boxShadow: "0 4px 24px rgba(139,92,246,0.35)",
                }}
              >
                {creating ? "Creando…" : "Crear conversación"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CHANNEL_LABELS = {
  web: "Web / panel",
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  instagram: "Instagram",
  telegram: "Telegram",
};

export function ChatContextPanel({
  workspaceId,
  channel,
  externalRef,
  senderName,
  isExternal,
}) {
  const [tables, setTables] = useState([]);
  const [mainTableId, setMainTableId] = useState(null);
  const [sampleTableId, setSampleTableId] = useState(null);
  const [mainRows, setMainRows] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const contactsTable = useMemo(() => pickTable(tables, scoreContactsTable), [tables]);
  const exampleTable = useMemo(() => {
    const ex = pickTable(tables, scoreSampleTable);
    if (!ex || !contactsTable) return ex;
    if (ex._id === contactsTable._id) {
      const other = tables.find((t) => t._id !== contactsTable._id);
      return other || ex;
    }
    return ex;
  }, [tables, contactsTable]);

  useEffect(() => {
    setMainTableId(null);
    setSampleTableId(null);
    setMainRows([]);
    setSampleRows([]);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      setTables([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listTables(workspaceId)
      .then((res) => {
        if (cancelled) return;
        setTables(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setTables([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (contactsTable) setMainTableId(contactsTable._id);
  }, [contactsTable]);

  useEffect(() => {
    if (exampleTable) setSampleTableId(exampleTable._id);
  }, [exampleTable]);

  useEffect(() => {
    if (!mainTableId || !sampleTableId || sampleTableId !== mainTableId) return;
    const alt = tables.find((t) => t._id !== mainTableId);
    setSampleTableId(alt?._id || null);
  }, [mainTableId, sampleTableId, tables]);

  useEffect(() => {
    if (!workspaceId || !mainTableId) {
      setMainRows([]);
      return;
    }
    let cancelled = false;
    getTableData(workspaceId, mainTableId, { limit: 6, skip: 0 })
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setMainRows(Array.isArray(d) ? d : d?.rows || []);
      })
      .catch(() => {
        if (!cancelled) setMainRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, mainTableId]);

  useEffect(() => {
    if (!workspaceId || !sampleTableId || sampleTableId === mainTableId) {
      if (sampleTableId === mainTableId) setSampleRows([]);
      else if (!sampleTableId) setSampleRows([]);
      return;
    }
    let cancelled = false;
    getTableData(workspaceId, sampleTableId, { limit: 5, skip: 0 })
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setSampleRows(Array.isArray(d) ? d : d?.rows || []);
      })
      .catch(() => {
        if (!cancelled) setSampleRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, sampleTableId, mainTableId]);

  const mainHeaders = useMemo(() => {
    const t = tables.find((x) => x._id === mainTableId);
    return t?.headers?.map((h) => h.key) || (mainRows[0] ? Object.keys(mainRows[0]) : []);
  }, [tables, mainTableId, mainRows]);

  const sampleHeaders = useMemo(() => {
    const t = tables.find((x) => x._id === sampleTableId);
    return t?.headers?.map((h) => h.key) || (sampleRows[0] ? Object.keys(sampleRows[0]) : []);
  }, [tables, sampleTableId, sampleRows]);

  const mainTableName = tables.find((t) => t._id === mainTableId)?.name || "—";
  const sampleTableName = tables.find((t) => t._id === sampleTableId)?.name || "—";

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0c0c12]/95 border-l border-white/[0.06]">
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contexto</p>
        <p className="text-sm font-semibold text-white mt-0.5">Esta conversación</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Tipo de canal</p>
          <p className="text-sm text-white font-medium">{CHANNEL_LABELS[channel] || channel || "Web"}</p>
          {isExternal ? (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Conversación iniciada por el cliente. Referencia:{" "}
              <span className="text-slate-300 font-mono text-[11px] break-all">{externalRef || "—"}</span>
              {senderName ? (
                <>
                  <br />
                  <span className="text-slate-500">Nombre:</span> {senderName}
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Chat desde el panel. Aquí ves un vistazo de tus tablas (contactos y ejemplo) para contrastar con lo que
              comenta el usuario.
            </p>
          )}
        </section>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : tables.length === 0 ? (
          <section className="rounded-xl border border-dashed border-white/10 p-4 text-center">
            <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No hay tablas en este proyecto</p>
            <Link to="/tables" className="text-xs text-violet-400 hover:underline mt-2 inline-block">
              Crear datos
            </Link>
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-white/[0.08] overflow-hidden">
              <div className="px-3 py-2 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200 truncate">Tu base · {mainTableName}</span>
                </div>
                <Link
                  to="/tables"
                  className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5 shrink-0"
                >
                  Abrir <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              {tables.length > 1 && (
                <div className="px-3 py-2 border-b border-white/[0.04]">
                  <select
                    value={mainTableId || ""}
                    onChange={(e) => setMainTableId(e.target.value)}
                    className="w-full text-xs bg-slate-900/80 text-slate-300 rounded-lg px-2 py-1.5 border border-white/10"
                  >
                    {tables.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-600 mt-1">Sugerimos tablas con nombres tipo “clientes” o “contactos”.</p>
                </div>
              )}
              <div className="p-2 max-h-52 overflow-y-auto">
                {mainRows.length === 0 ? (
                  <p className="text-xs text-slate-500 px-2 py-3">Sin filas aún.</p>
                ) : (
                  <ul className="space-y-2">
                    {mainRows.map((row, i) => (
                      <li
                        key={row._id || row.id || i}
                        className="text-[11px] rounded-lg bg-black/20 border border-white/[0.05] px-2 py-1.5"
                      >
                        {rowPreview(row, mainHeaders).map(({ key, val }) => (
                          <div key={key} className="flex gap-1 truncate">
                            <span className="text-slate-600 shrink-0">{key}:</span>
                            <span className="text-slate-300 truncate">{val}</span>
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {sampleTableId && sampleTableId !== mainTableId && (
              <section className="rounded-xl border border-violet-500/15 overflow-hidden bg-violet-500/[0.03]">
                <div className="px-3 py-2 border-b border-violet-500/10 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-semibold text-violet-200/90">Ejemplo / plantilla · {sampleTableName}</span>
                </div>
                <div className="p-2 max-h-40 overflow-y-auto">
                  {sampleRows.length === 0 ? (
                    <p className="text-xs text-slate-500 px-2 py-2">Sin filas.</p>
                  ) : (
                    <ul className="space-y-2">
                      {sampleRows.map((row, i) => (
                        <li
                          key={row._id || row.id || i}
                          className="text-[11px] rounded-lg bg-black/25 border border-violet-500/10 px-2 py-1.5"
                        >
                          {rowPreview(row, sampleHeaders, 3).map(({ key, val }) => (
                            <div key={key} className="flex gap-1 truncate">
                              <span className="text-slate-600 shrink-0">{key}:</span>
                              <span className="text-slate-300 truncate">{val}</span>
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}

            <p className="text-[10px] text-slate-600 leading-relaxed px-1">
              Los datos son una vista rápida; la fuente de verdad está en <Link to="/tables" className="text-violet-500/80 hover:underline">Datos</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
