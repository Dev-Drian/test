/**
 * ImportModal - Modal de importación CSV en 3 pasos
 * Paso 1: Subir archivo CSV (drag & drop o browse)
 * Paso 2: Confirmar mapeo de columnas → campos
 * Paso 3: Progreso e informe de resultados
 */

import { useState, useRef, useCallback } from "react";
import { importPreviewTable, importTableData } from "../api/client";

// ─── Icons ────────────────────────────────────────────────────────────────────
const UploadIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
  </svg>
);

// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ current }) {
  const steps = ["Subir archivo", "Mapear columnas", "Importar"];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < current ? "bg-emerald-500 text-white" :
              i === current ? "bg-sky-500 text-white ring-2 ring-sky-500/30" :
              "bg-slate-700 text-slate-500"
            }`}>
              {i < current ? <CheckIcon /> : i + 1}
            </div>
            <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${i === current ? "text-sky-400" : i < current ? "text-emerald-400" : "text-slate-600"}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-2 -mt-3 transition-all ${i < current ? "bg-emerald-500/60" : "bg-slate-700"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────
function StepUpload({ onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback((file) => {
    setError("");
    if (!file) return;
    if (!file.name.match(/\.csv$/i)) {
      setError("Solo se aceptan archivos .csv");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo no puede superar 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onFile(file.name, e.target.result);
    reader.readAsText(file, "UTF-8");
  }, [onFile]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer p-10 flex flex-col items-center gap-3 ${
          dragging ? "border-sky-400 bg-sky-500/10" : "border-slate-600 hover:border-slate-400 bg-slate-800/50"
        }`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
      >
        <div className={`p-3 rounded-full transition-all ${dragging ? "bg-sky-500/20 text-sky-400" : "bg-slate-700 text-slate-400"}`}>
          <UploadIcon />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300">
            {dragging ? "Suelta el archivo aquí" : "Arrastra tu CSV o haz clic para seleccionarlo"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Máximo 5 MB · Separador , o ;</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertIcon />
          {error}
        </div>
      )}

      <p className="text-xs text-slate-500 text-center">
        El archivo debe tener encabezados en la primera fila. Se soportan archivos con BOM (exportados desde Excel).
      </p>
    </div>
  );
}

// ─── Step 2: Mapping ─────────────────────────────────────────────────────────
function StepMapping({ preview, loading, onMappingChange, onConfirm }) {
  const [mapping, setMapping] = useState(() => {
    const m = {};
    if (preview?.mapping) {
      Object.entries(preview.mapping).forEach(([csvCol, tableKey]) => {
        m[csvCol] = tableKey;
      });
    }
    return m;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Analizando archivo...</p>
      </div>
    );
  }

  if (!preview) return null;

  const handleChange = (csvCol, tableKey) => {
    const next = { ...mapping, [csvCol]: tableKey };
    setMapping(next);
    onMappingChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Info strip */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>{preview.totalRows} filas detectadas · {preview.csvColumns?.length} columnas CSV</span>
        <span>{preview.tableHeaders?.length} campos en la tabla</span>
      </div>

      {/* Mapping table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(71,85,105,0.4)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Columna CSV</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">→ Campo de la tabla</th>
            </tr>
          </thead>
          <tbody>
            {(preview.csvColumns || []).map((col, i) => (
              <tr key={col} className={i % 2 === 0 ? "bg-slate-800/30" : "bg-slate-800/10"}>
                <td className="px-4 py-2 text-slate-300 font-mono text-xs">{col}</td>
                <td className="px-4 py-2">
                  <select
                    value={mapping[col] || ""}
                    onChange={(e) => handleChange(col, e.target.value)}
                    className="w-full bg-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 border border-slate-600 focus:border-sky-500 outline-none"
                  >
                    <option value="">— Ignorar columna —</option>
                    {(preview.tableHeaders || []).map((h) => (
                      <option key={h.key} value={h.key}>
                        {h.label} ({h.type})
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview rows */}
      {preview.preview?.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2 font-medium">Vista previa (5 primeras filas):</p>
          <div className="rounded-xl overflow-auto max-h-36" style={{ border: "1px solid rgba(71,85,105,0.3)" }}>
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="bg-slate-800/80">
                  {(preview.csvColumns || []).map((col) => (
                    <th key={col} className="px-3 py-1.5 text-left text-slate-500 font-semibold whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} className="border-t border-slate-700/50">
                    {(preview.csvColumns || []).map((col) => (
                      <td key={col} className="px-3 py-1.5 text-slate-400 whitespace-nowrap max-w-30 truncate" title={row[col]}>
                        {row[col] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={() => onConfirm(mapping)}
        className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold transition-all shadow-lg shadow-sky-500/20"
      >
        Confirmar e importar →
      </button>
    </div>
  );
}

// ─── Step 3: Result ───────────────────────────────────────────────────────────
function StepResult({ result, loading, onClose }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Importando registros...</p>
        {result?.total > 0 && (
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${Math.round(((result.imported + result.skipped) / result.total) * 100)}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  if (!result) return null;

  const successRate = result.total > 0 ? Math.round((result.imported / result.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
          <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
          <p className="text-xs text-slate-500 mt-0.5">Importados</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <p className="text-2xl font-bold text-amber-400">{result.skipped}</p>
          <p className="text-xs text-slate-500 mt-0.5">Omitidos</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p className="text-2xl font-bold text-red-400">{result.errors?.length || 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">Errores</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${successRate}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{successRate}% exitoso</span>
      </div>

      {/* Errors list */}
      {result.errors?.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.25)" }}>
          <div className="px-4 py-2 bg-red-500/10 flex items-center gap-2">
            <AlertIcon />
            <span className="text-xs font-semibold text-red-400">Errores de importación</span>
          </div>
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-700/50">
            {result.errors.map((err, i) => (
              <div key={i} className="px-4 py-2 text-xs">
                <span className="text-slate-500">Fila {err.row}: </span>
                <span className="text-red-400">{err.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        Listo — ver tabla actualizada
      </button>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function ImportModal({ workspaceId, table, onClose, onSuccess }) {
  const [step, setStep] = useState(0);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mapping, setMapping] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const handleFile = async (name, text) => {
    setFileName(name);
    setCsvText(text);
    setStep(1);
    setPreviewLoading(true);
    setGlobalError("");
    try {
      const res = await importPreviewTable(workspaceId, table._id, text);
      setPreview(res.data);
      setMapping(res.data.mapping || {});
    } catch (e) {
      setGlobalError(e.response?.data?.message || e.message || "Error al analizar el archivo");
      setStep(0);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async (finalMapping) => {
    setStep(2);
    setImportLoading(true);
    setGlobalError("");
    try {
      const res = await importTableData(workspaceId, table._id, csvText, finalMapping, { skipDuplicates: false });
      setImportResult(res.data);
      if (res.data.imported > 0) onSuccess?.();
    } catch (e) {
      setGlobalError(e.response?.data?.message || e.message || "Error durante la importación");
      setStep(1);
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "#1e293b", border: "1px solid rgba(71,85,105,0.5)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div>
            <h2 className="text-base font-bold text-white">Importar CSV</h2>
            <p className="text-xs text-slate-500 mt-0.5">→ {table?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-6 overflow-y-auto flex-1">
          <Stepper current={step} />

          {globalError && (
            <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-red-400 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <AlertIcon /> {globalError}
            </div>
          )}

          {step === 0 && <StepUpload onFile={handleFile} />}
          {step === 1 && (
            <StepMapping
              preview={preview}
              loading={previewLoading}
              onMappingChange={setMapping}
              onConfirm={handleConfirm}
            />
          )}
          {step === 2 && (
            <StepResult
              result={importResult}
              loading={importLoading}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
