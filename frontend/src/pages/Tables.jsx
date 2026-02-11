import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listTables, createTable, getTableData, addTableRow } from "../api/client";
import TableBuilder from "../components/TableBuilder";

// Iconos SVG
const Icons = {
  table: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  rows: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  ),
  fields: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  ),
  empty: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
};

export default function Tables() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);

  // Add row state
  const [showAddRow, setShowAddRow] = useState(false);
  const [rowForm, setRowForm] = useState({});
  const [addingRow, setAddingRow] = useState(false);
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    listTables(workspaceId)
      .then((res) => setTables(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !selectedTable) {
      setTableData([]);
      return;
    }
    setLoadingData(true);
    getTableData(workspaceId, selectedTable._id)
      .then((res) => setTableData(res.data || []))
      .finally(() => setLoadingData(false));
  }, [workspaceId, selectedTable]);

  const handleCreateTable = async (tableConfig) => {
    if (!workspaceId) return;
    setCreating(true);
    try {
      const res = await createTable({ workspaceId, ...tableConfig });
      setTables((prev) => [...prev, res.data]);
      setShowBuilder(false);
      setSelectedTable(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleAddRow = async (e) => {
    e.preventDefault();
    if (!workspaceId || !selectedTable) return;
    setRowError("");
    setAddingRow(true);
    try {
      await addTableRow(workspaceId, selectedTable._id, rowForm);
      setRowForm({});
      setShowAddRow(false);
      const res = await getTableData(workspaceId, selectedTable._id);
      setTableData(res.data || []);
    } catch (err) {
      setRowError(err.response?.data?.error || err.message);
    } finally {
      setAddingRow(false);
    }
  };

  const getVisibleHeaders = () => {
    if (!selectedTable?.headers) return [];
    return selectedTable.headers.filter((h) => !h.hiddenFromChat);
  };

  // Sin workspace
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full bg-[#09090b]">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6 text-blue-400">
            {Icons.table}
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Tablas</h1>
          <p className="text-zinc-500 mb-6 max-w-sm">
            Selecciona un workspace para gestionar sus tablas
          </p>
          <Link 
            to="/workspaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors"
          >
            Ir a Workspaces
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-zinc-500">Cargando tablas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Modal de creación */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0c0f] border border-white/[0.08] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#0c0c0f] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-semibold text-white">Crear nueva tabla</h2>
                <p className="text-sm text-zinc-500">Define la estructura de tus datos</p>
              </div>
              <button
                onClick={() => setShowBuilder(false)}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                {Icons.close}
              </button>
            </div>
            <div className="p-6">
              <TableBuilder
                onSave={handleCreateTable}
                onCancel={() => setShowBuilder(false)}
                availableTables={tables}
                loading={creating}
              />
            </div>
          </div>
        </div>
      )}

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                  {Icons.table}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-white tracking-tight">Tablas</h1>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Gestiona los datos de {workspaceName}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowBuilder(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20"
              >
                {Icons.plus}
                <span>Nueva tabla</span>
              </button>
            </div>
          </header>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-400">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                {Icons.close}
              </button>
            </div>
          )}

          {/* Sin tablas */}
          {tables.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6 text-blue-400">
                {Icons.table}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No hay tablas</h3>
              <p className="text-zinc-500 mb-8 max-w-md mx-auto">
                Crea tu primera tabla para almacenar y organizar los datos de tu negocio
              </p>
              <button 
                onClick={() => setShowBuilder(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20"
              >
                {Icons.plus}
                Crear mi primera tabla
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {/* Sidebar - Lista de tablas */}
              <div className="col-span-12 lg:col-span-3">
                <div className="sticky top-8">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-zinc-400">Tablas</h3>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium">
                        {tables.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {tables.map((t) => (
                        <button
                          key={t._id}
                          onClick={() => setSelectedTable(t)}
                          className={`w-full text-left p-3 rounded-xl transition-all ${
                            selectedTable?._id === t._id
                              ? "bg-blue-500/10 border border-blue-500/30"
                              : "hover:bg-white/[0.03] border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              selectedTable?._id === t._id 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-white/[0.03] text-zinc-500'
                            }`}>
                              {Icons.table}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`block font-medium truncate ${
                                selectedTable?._id === t._id ? 'text-blue-400' : 'text-white'
                              }`}>
                                {t.name}
                              </span>
                              <span className="text-xs text-zinc-600">
                                {t.headers?.length || 0} campos
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main content - Datos de la tabla */}
              <div className="col-span-12 lg:col-span-9">
                {!selectedTable ? (
                  <div className="text-center py-20 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4 text-zinc-600">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Selecciona una tabla</h3>
                    <p className="text-sm text-zinc-500">
                      Elige una tabla del panel izquierdo para ver sus datos
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                    {/* Table header */}
                    <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                          {Icons.table}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{selectedTable.name}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                              {Icons.rows}
                              {tableData.length} registros
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                              {Icons.fields}
                              {selectedTable.headers?.length || 0} campos
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowAddRow(!showAddRow);
                          setRowForm({});
                          setRowError("");
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          showAddRow 
                            ? 'bg-zinc-800 text-zinc-400' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {showAddRow ? (
                          <>
                            {Icons.close}
                            <span>Cancelar</span>
                          </>
                        ) : (
                          <>
                            {Icons.plus}
                            <span>Agregar fila</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Add row form */}
                    {showAddRow && (
                      <div className="p-5 border-b border-white/[0.06] bg-white/[0.01]">
                        <form onSubmit={handleAddRow}>
                          <h4 className="text-sm font-medium text-zinc-300 mb-4">Nueva fila</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            {getVisibleHeaders().map((header) => (
                              <div key={header.key}>
                                <label className="text-xs text-zinc-500 block mb-1.5">
                                  {header.label}
                                  {header.required && <span className="text-red-400 ml-1">*</span>}
                                </label>
                                <input
                                  type={header.type === "number" ? "number" : header.type === "date" ? "date" : header.type === "email" ? "email" : "text"}
                                  value={rowForm[header.key] || ""}
                                  onChange={(e) => setRowForm({ ...rowForm, [header.key]: e.target.value })}
                                  placeholder={header.label}
                                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                  required={header.required}
                                />
                              </div>
                            ))}
                          </div>
                          {rowError && (
                            <p className="text-sm text-red-400 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                              {rowError}
                            </p>
                          )}
                          <div className="flex gap-3">
                            <button 
                              type="submit" 
                              disabled={addingRow}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {addingRow ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Guardando...</span>
                                </>
                              ) : (
                                <>
                                  {Icons.check}
                                  <span>Guardar</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddRow(false)}
                              className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.06] hover:text-white transition-all"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Table data */}
                    {loadingData ? (
                      <div className="p-12 text-center">
                        <div className="relative w-8 h-8 mx-auto mb-3">
                          <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
                          <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-sm text-zinc-500">Cargando datos...</p>
                      </div>
                    ) : tableData.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-14 h-14 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4 text-zinc-600">
                          {Icons.empty}
                        </div>
                        <h4 className="text-white font-medium mb-1">Sin registros</h4>
                        <p className="text-sm text-zinc-500 mb-4">Esta tabla está vacía</p>
                        <button
                          onClick={() => setShowAddRow(true)}
                          className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                        >
                          Agregar el primer registro →
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/[0.06]">
                              {Object.keys(tableData[0])
                                .filter((k) => !k.startsWith("_") && k !== "main" && k !== "tableId")
                                .map((k) => (
                                  <th
                                    key={k}
                                    className="text-left py-4 px-5 text-zinc-400 font-medium text-xs uppercase tracking-wider"
                                  >
                                    {k}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tableData.map((row, i) => (
                              <tr
                                key={row._id || i}
                                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                              >
                                {Object.keys(tableData[0])
                                  .filter((k) => !k.startsWith("_") && k !== "main" && k !== "tableId")
                                  .map((k) => (
                                    <td key={k} className="py-4 px-5 text-zinc-300 text-sm">
                                      {String(row[k] ?? "-")}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
