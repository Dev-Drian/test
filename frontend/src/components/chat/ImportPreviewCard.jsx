/**
 * ImportPreviewCard - Muestra preview de importación CSV/Excel con tabla de mapeo.
 */
import { BarChart3, Check, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import renderMarkdown from './ChatMarkdown';

export default function ImportPreviewCard({ message, onConfirm, onCancel, confirming, agentName }) {
  const { preview } = message;
  if (!preview) return null;
  const { mapping = {}, csvColumns = [], tableHeaders = [], tableName, totalRows, preview: sampleRows = [] } = preview;
  const mappedCount = Object.keys(mapping).length;
  const unmappedCols = csvColumns.filter(c => !mapping[c]);

  return (
    <div className="py-5" style={{ borderTop: '1px solid rgba(100,116,139,0.15)' }}>
      <div className="flex gap-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide text-emerald-400">{agentName}</p>
          <div className="p-4 rounded-xl mb-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-sm text-slate-200 font-medium mb-1">
              <BarChart3 className="w-4 h-4 inline mr-1 text-emerald-400" /> Analicé <strong>{message.file?.name}</strong> — {totalRows} filas detectadas
            </p>
            <p className="text-xs text-slate-400">
              Tabla destino: <span className="text-emerald-400 font-semibold">{tableName}</span>
              {' · '}{mappedCount}/{csvColumns.length} columnas mapeadas correctamente
            </p>
          </div>

          {/* Mapping table */}
          <div className="mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(100,116,139,0.2)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(51,65,85,0.5)' }}>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">Columna archivo</th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">→ Campo en sistema</th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {csvColumns.map(col => {
                  const mapped = mapping[col];
                  const header = tableHeaders.find(h => h.key === mapped);
                  return (
                    <tr key={col} style={{ borderTop: '1px solid rgba(100,116,139,0.1)' }}>
                      <td className="px-3 py-1.5 text-slate-300 font-mono">{col}</td>
                      <td className="px-3 py-1.5 text-slate-300">{header?.label || mapped || '—'}</td>
                      <td className="px-3 py-1.5">
                        {mapped
                          ? <span className="text-emerald-400 text-[10px]"><Check className="w-3 h-3 inline" /> mapeado</span>
                          : <span className="text-amber-400 text-[10px]"><AlertTriangle className="w-3 h-3 inline" /> ignorado</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sample rows */}
          {sampleRows.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1.5">Vista previa ({sampleRows.length} filas):</p>
              <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid rgba(100,116,139,0.2)' }}>
                <table className="text-xs whitespace-nowrap">
                  <thead><tr style={{ background: 'rgba(51,65,85,0.5)' }}>{Object.keys(sampleRows[0]).map(k => <th key={k} className="px-3 py-1.5 text-left text-slate-400 font-medium">{k}</th>)}</tr></thead>
                  <tbody>{sampleRows.map((row, i) => <tr key={i} style={{ borderTop: '1px solid rgba(100,116,139,0.1)' }}>{Object.values(row).map((v, j) => <td key={j} className="px-3 py-1.5 text-slate-300 max-w-32 truncate">{String(v ?? '')}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {unmappedCols.length > 0 && (
            <p className="text-xs text-amber-400 mb-3">
              <AlertTriangle className="w-3 h-3 inline mr-1" /> {unmappedCols.length} columna(s) sin mapear serán ignoradas: {unmappedCols.join(', ')}
            </p>
          )}

          {message.type === 'import_done' ? (
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{renderMarkdown(message.content)}</div>
          ) : (
            <div className="flex items-center gap-3 mt-2">
              <button onClick={onConfirm} disabled={confirming}
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.03] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}
              >
                {confirming ? <><Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> Importando...</> : <><CheckCircle className="w-4 h-4 inline mr-1" /> Confirmar ({totalRows} registros)</>}
              </button>
              <button
                onClick={onCancel}
                disabled={confirming}
                className="px-4 py-2 rounded-xl text-slate-400 text-sm font-medium hover:text-slate-200 hover:bg-slate-700/50 transition-all disabled:opacity-50"
                style={{ border: '1px solid rgba(100, 116, 139, 0.3)' }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
