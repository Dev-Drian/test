import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listTables, createTable, getTableData, addTableRow, updateTableRow, deleteTableRow } from "../api/client";
import TableBuilder from "../components/TableBuilder";
import { useToast, useConfirm } from "../components/Toast";

// Iconos SVG compactos
const Icons = {
  table: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" /></svg>,
  plus: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  close: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
  rows: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>,
  fields: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>,
  empty: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>,
  help: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>,
  lightbulb: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>,
  search: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  download: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  code: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
  edit: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>,
  trash: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  error: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  arrow: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18" /></svg>,
};

export default function Tables() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Add row state
  const [showAddRow, setShowAddRow] = useState(false);
  const [rowForm, setRowForm] = useState({});
  const [addingRow, setAddingRow] = useState(false);
  const [rowError, setRowError] = useState("");

  // Search & Edit state
  const [searchQuery, setSearchQuery] = useState("");
  const [dataSearchQuery, setDataSearchQuery] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingRow, setDeletingRow] = useState(null);

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
      toast.success(`Tabla "${tableConfig.name}" creada correctamente`);
    } catch (err) {
      toast.error(`Error al crear tabla: ${err.response?.data?.error || err.message}`);
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
      toast.success("Registro agregado correctamente");
    } catch (err) {
      toast.error(`Error: ${err.response?.data?.error || err.message}`);
      setRowError(err.response?.data?.error || err.message);
    } finally {
      setAddingRow(false);
    }
  };

  // Editar fila
  const handleEditRow = (row) => {
    setEditingRow(row._id);
    setEditForm({ ...row });
  };

  const handleSaveEdit = async () => {
    if (!workspaceId || !selectedTable || !editingRow) return;
    setSavingEdit(true);
    try {
      // Filtrar campos internos
      const { _id, _rev, tableId, createdAt, updatedAt, ...data } = editForm;
      await updateTableRow(workspaceId, selectedTable._id, editingRow, data);
      const res = await getTableData(workspaceId, selectedTable._id);
      setTableData(res.data || []);
      setEditingRow(null);
      setEditForm({});
      toast.success("Registro actualizado correctamente");
    } catch (err) {
      toast.error(`Error al actualizar: ${err.response?.data?.error || err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditForm({});
  };

  // Eliminar fila
  const handleDeleteRow = async (row) => {
    const confirmed = await confirm({
      title: 'Eliminar Registro',
      message: '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger'
    });
    if (!confirmed) return;

    setDeletingRow(row._id);
    try {
      await deleteTableRow(workspaceId, selectedTable._id, row._id);
      setTableData(prev => prev.filter(r => r._id !== row._id));
      toast.success("Registro eliminado correctamente");
    } catch (err) {
      toast.error(`Error al eliminar: ${err.response?.data?.error || err.message}`);
    } finally {
      setDeletingRow(null);
    }
  };

  // Filtrar datos por búsqueda
  const filteredData = tableData.filter(row => {
    if (!dataSearchQuery.trim()) return true;
    const query = dataSearchQuery.toLowerCase();
    return Object.entries(row).some(([key, value]) => {
      if (key.startsWith('_') || key === 'tableId') return false;
      return String(value).toLowerCase().includes(query);
    });
  });

  // Exportar a CSV
  const exportToCSV = () => {
    if (!selectedTable || !tableData.length) return;
    
    const headers = selectedTable.headers.map(h => h.label);
    const rows = tableData.map(row => 
      selectedTable.headers.map(h => {
        const value = row[h.key];
        // Escapar comillas y valores con comas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTable.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado ${tableData.length} registros a CSV`);
  };

  // Exportar a JSON
  const exportToJSON = () => {
    if (!selectedTable || !tableData.length) return;
    
    const exportData = {
      table: selectedTable.name,
      exportedAt: new Date().toISOString(),
      headers: selectedTable.headers,
      data: tableData,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTable.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado ${tableData.length} registros a JSON`);
  };

  const getVisibleHeaders = () => {
    if (!selectedTable?.headers) return [];
    return selectedTable.headers.filter((h) => !h.hiddenFromChat);
  };

  // Sin workspace
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-0">
        <div className="text-center animate-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-6 text-primary-400">
            {Icons.table}
          </div>
          <h1 className="text-2xl font-semibold text-content-primary mb-2">Tablas</h1>
          <p className="text-content-tertiary mb-6 max-w-sm">
            Selecciona un workspace para gestionar sus tablas
          </p>
          <Link 
            to="/workspaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors"
          >
            Ir a Workspaces
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-200 animate-pulse" />
              <div>
                <div className="h-6 w-32 bg-surface-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-surface-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-10 w-32 bg-surface-200 rounded-lg animate-pulse" />
          </div>
          
          {/* Skeleton Content */}
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-3">
              <div className="p-5 rounded-2xl bg-surface-100 border border-surface-300/50">
                <div className="h-5 w-20 bg-surface-200 rounded animate-pulse mb-4" />
                <div className="h-10 w-full bg-surface-200/50 rounded-xl animate-pulse mb-5" />
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 rounded-xl bg-surface-200/30 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-surface-300/50" />
                        <div className="flex-1">
                          <div className="h-4 w-24 bg-surface-300/50 rounded mb-2" />
                          <div className="h-3 w-16 bg-surface-300/30 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-9">
              <div className="h-[500px] rounded-2xl bg-surface-100 border border-surface-300/50 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Modal de creación */}
      {showBuilder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-50 border border-surface-300 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="sticky top-0 bg-surface-50 border-b border-surface-300/50 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-semibold text-content-primary">Crear nueva tabla</h2>
                <p className="text-sm text-content-tertiary">Define la estructura de tus datos</p>
              </div>
              <button
                onClick={() => setShowBuilder(false)}
                className="p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-200 transition-all"
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
          <header className="mb-8 animate-fade-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 text-white">
                  {Icons.table}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-content-primary tracking-tight">Tablas</h1>
                  <p className="text-sm text-content-tertiary mt-0.5">
                    Gestiona los datos de {workspaceName}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowBuilder(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20"
              >
                {Icons.plus}
                <span>Nueva tabla</span>
              </button>
            </div>
          </header>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-fade-up">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                {Icons.error}
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
            <div className="text-center py-20 bg-surface-100 border border-surface-300 rounded-2xl animate-fade-up">
              <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-6 text-primary-400">
                {Icons.table}
              </div>
              <h3 className="text-xl font-semibold text-content-primary mb-2">No hay tablas</h3>
              <p className="text-content-tertiary mb-8 max-w-md mx-auto">
                Crea tu primera tabla para almacenar y organizar los datos de tu negocio
              </p>
              <button 
                onClick={() => setShowBuilder(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20"
              >
                {Icons.plus}
                Crear mi primera tabla
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-8 animate-fade-up">
              {/* Sidebar - Lista de tablas */}
              <div className="col-span-12 lg:col-span-3">
                <div className="sticky top-8">
                  <div className="p-5 rounded-2xl bg-surface-100 border border-surface-300">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-content-primary">Tablas</h3>
                      <span className="px-3 py-1.5 rounded-full bg-primary-500 text-white text-xs font-bold shadow-lg shadow-primary-500/30">
                        {tables.length}
                      </span>
                    </div>
                    
                    {/* Barra de búsqueda de tablas */}
                    <div className="relative mb-5">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted">
                        {Icons.search}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Buscar tabla..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-200/50 border border-surface-300/50 text-content-primary placeholder-content-muted text-sm focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      {tables.filter(t => !searchQuery.trim() || t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((t) => (
                        <button
                          key={t._id}
                          onClick={() => setSelectedTable(t)}
                          className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${
                            selectedTable?._id === t._id
                              ? "bg-primary-500/10 border border-primary-500/30 shadow-lg shadow-primary-500/10"
                              : "hover:bg-surface-200/50 border border-transparent hover:border-surface-300/50"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                              selectedTable?._id === t._id 
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/40 scale-110' 
                                : 'bg-surface-200 text-content-muted group-hover:bg-surface-300 group-hover:scale-105'
                            }`}>
                              {Icons.table}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`block font-semibold truncate transition-colors ${
                                selectedTable?._id === t._id ? 'text-primary-400' : 'text-content-primary group-hover:text-primary-400'
                              }`}>
                                {t.name}
                              </span>
                              <span className="text-[11px] text-content-muted font-medium">
                                {t.headers?.length || 0} campos
                              </span>
                            </div>
                            {selectedTable?._id === t._id && (
                              <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                            )}
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
                  <div className="relative h-[500px] flex items-center justify-center rounded-2xl bg-surface-100 border border-surface-300/50 overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-10 left-10 w-20 h-20 bg-primary-500/5 rounded-full blur-2xl" />
                    <div className="absolute bottom-10 right-10 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
                    
                    <div className="text-center z-10">
                      <div className="w-24 h-24 rounded-2xl bg-surface-200 flex items-center justify-center mx-auto mb-6 text-content-muted border border-surface-300/50 shadow-2xl">
                        {Icons.arrow}
                      </div>
                      <h3 className="text-2xl font-bold text-content-primary mb-3">Selecciona una tabla</h3>
                      <p className="text-content-tertiary max-w-sm mx-auto">
                        Elige una tabla del panel izquierdo para visualizar y gestionar sus registros
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-surface-100 border border-surface-300/50 overflow-hidden shadow-xl">
                    {/* Table header */}
                    <div className="relative p-8 border-b border-surface-300/50 overflow-hidden">
                      {/* Background glow */}
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl" />
                      
                      <div className="relative flex items-start justify-between mb-6">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-2xl shadow-primary-500/30 ring-4 ring-surface-200/50">
                            {Icons.table}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-content-primary mb-1">{selectedTable.name}</h3>
                            <p className="text-sm text-content-tertiary">
                              {selectedTable.description || "Gestiona los registros de esta tabla"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Botones de exportación */}
                          {tableData.length > 0 && (
                            <div className="flex items-center gap-1 mr-2">
                              <button
                                onClick={exportToCSV}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-200/50 text-content-secondary hover:bg-surface-300 hover:text-content-primary border border-surface-300/50 transition-all"
                                title="Exportar a CSV"
                              >
                                {Icons.download}
                                CSV
                              </button>
                              <button
                                onClick={exportToJSON}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-200/50 text-content-secondary hover:bg-surface-300 hover:text-content-primary border border-surface-300/50 transition-all"
                                title="Exportar a JSON"
                              >
                                {Icons.code}
                                JSON
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setShowAddRow(!showAddRow);
                              setRowForm({});
                              setRowError("");
                            }}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                              showAddRow 
                                ? 'bg-surface-300 text-content-secondary hover:bg-surface-400' 
                                : 'bg-gradient-to-r from-accent-500 to-accent-600 text-white hover:from-accent-400 hover:to-accent-500 shadow-xl shadow-accent-500/30 hover:shadow-accent-500/50 hover:scale-105'
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
                                <span>Nuevo registro</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Stats cards */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20 group hover:border-primary-500/40 transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-primary-500/20 text-primary-400">
                              {Icons.rows}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-content-muted font-semibold">Registros</span>
                          </div>
                          <p className="text-3xl font-bold text-primary-400">{filteredData.length}{dataSearchQuery && ` / ${tableData.length}`}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 group hover:border-violet-500/40 transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400">
                              {Icons.fields}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-content-muted font-semibold">Campos</span>
                          </div>
                          <p className="text-3xl font-bold text-violet-400">{selectedTable.headers?.length || 0}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-accent-500/5 border border-accent-500/20 group hover:border-accent-500/40 transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-accent-500/20 text-accent-400">
                              {Icons.check}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-content-muted font-semibold">Requeridos</span>
                          </div>
                          <p className="text-3xl font-bold text-accent-400">{selectedTable.headers?.filter(h => h.required)?.length || 0}</p>
                        </div>
                      </div>
                      
                      {/* Barra de búsqueda de datos */}
                      {tableData.length > 0 && (
                        <div className="mt-4 relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted">
                            {Icons.search}
                          </div>
                          <input 
                            type="text" 
                            placeholder="Buscar en registros..."
                            value={dataSearchQuery}
                            onChange={(e) => setDataSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-surface-200/50 border border-surface-300/50 text-content-primary placeholder-content-muted text-sm focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                          />
                          {dataSearchQuery && (
                            <button 
                              onClick={() => setDataSearchQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-300 transition-all"
                            >
                              {Icons.close}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Add row form */}
                    {showAddRow && (
                      <div className="p-5 border-b border-surface-300/50 bg-surface-50">
                        <form onSubmit={handleAddRow}>
                          <h4 className="text-sm font-medium text-content-secondary mb-4">Nueva fila</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            {getVisibleHeaders().map((header) => (
                              <div key={header.key}>
                                <label className="text-xs text-content-muted block mb-1.5">
                                  {header.label}
                                  {header.required && <span className="text-red-400 ml-1">*</span>}
                                </label>
                                <input
                                  type={header.type === "number" ? "number" : header.type === "date" ? "date" : header.type === "email" ? "email" : "text"}
                                  value={rowForm[header.key] || ""}
                                  onChange={(e) => setRowForm({ ...rowForm, [header.key]: e.target.value })}
                                  placeholder={header.label}
                                  className="w-full px-3 py-2.5 rounded-lg bg-surface-200/50 border border-surface-300/50 text-content-primary placeholder-content-muted focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
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
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                              className="px-4 py-2 rounded-lg bg-surface-200 border border-surface-300/50 text-content-secondary text-sm font-medium hover:bg-surface-300 hover:text-content-primary transition-all"
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
                          <div className="absolute inset-0 border-2 border-primary-500/20 rounded-full" />
                          <div className="absolute inset-0 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-sm text-content-tertiary">Cargando datos...</p>
                      </div>
                    ) : tableData.length === 0 ? (
                      <div className="p-16 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-surface-200 flex items-center justify-center mx-auto mb-6 text-content-muted border border-surface-300/50">
                          {Icons.empty}
                        </div>
                        <h4 className="text-xl text-content-primary font-medium mb-2">Tabla vacía</h4>
                        <p className="text-sm text-content-tertiary mb-6 max-w-sm mx-auto">No hay registros en esta tabla aún. Comienza agregando tu primer registro.</p>
                        <button
                          onClick={() => setShowAddRow(true)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20"
                        >
                          {Icons.plus}
                          Agregar primer registro
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full" style={{ minWidth: '800px' }}>
                          <thead>
                            <tr className="bg-surface-200/80">
                              <th className="text-left py-4 px-5 text-content-muted font-medium text-[10px] uppercase tracking-wider w-14">#</th>
                              {Object.keys(tableData[0])
                                .filter((k) => !k.startsWith("_") && k !== "main" && k !== "tableId" && k !== "createdAt" && k !== "updatedAt")
                                .map((k) => (
                                  <th
                                    key={k}
                                    className="text-left py-4 px-5 text-content-secondary font-semibold text-[11px] uppercase tracking-wider border-l border-surface-300/50"
                                    style={{ minWidth: '130px' }}
                                  >
                                    {k}
                                  </th>
                                ))}
                              <th className="text-center py-4 px-5 text-content-muted font-medium text-[10px] uppercase tracking-wider border-l border-surface-300/50 w-32">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-300/50">
                            {filteredData.map((row, i) => (
                              <tr
                                key={row._id || i}
                                className={`transition-colors group ${editingRow === row._id ? 'bg-primary-500/10' : 'hover:bg-primary-500/5'}`}
                              >
                                <td className="py-4 px-5 text-content-muted text-xs font-mono">{i + 1}</td>
                                {Object.keys(tableData[0])
                                  .filter((k) => !k.startsWith("_") && k !== "main" && k !== "tableId" && k !== "createdAt" && k !== "updatedAt")
                                  .map((k) => (
                                    <td key={k} className="py-4 px-5 text-content-secondary text-sm border-l border-surface-300/50 group-hover:text-content-primary transition-colors" style={{ minWidth: '130px' }}>
                                      {editingRow === row._id ? (
                                        <input
                                          type="text"
                                          value={editForm[k] ?? ""}
                                          onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })}
                                          className="w-full px-2 py-1.5 rounded bg-surface-300/50 border border-surface-400 text-content-primary text-sm focus:outline-none focus:border-primary-500"
                                        />
                                      ) : (
                                        <span className="block truncate" title={String(row[k] ?? "-")}>{String(row[k] ?? "-")}</span>
                                      )}
                                    </td>
                                  ))}
                                <td className="py-4 px-3 border-l border-surface-300/50">
                                  <div className="flex items-center justify-center gap-1">
                                    {editingRow === row._id ? (
                                      <>
                                        <button
                                          onClick={handleSaveEdit}
                                          disabled={savingEdit}
                                          className="p-2 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-all disabled:opacity-50"
                                          title="Guardar"
                                        >
                                          {savingEdit ? (
                                            <div className="w-4 h-4 border-2 border-accent-400/30 border-t-accent-400 rounded-full animate-spin" />
                                          ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </button>
                                        <button
                                          onClick={handleCancelEdit}
                                          className="p-2 rounded-lg bg-surface-300/50 text-content-secondary hover:bg-surface-400 transition-all"
                                          title="Cancelar"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleEditRow(row)}
                                          className="p-2 rounded-lg text-content-muted hover:bg-primary-500/20 hover:text-primary-400 transition-all opacity-0 group-hover:opacity-100"
                                          title="Editar"
                                        >
                                          {Icons.edit}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRow(row)}
                                          disabled={deletingRow === row._id}
                                          className="p-2 rounded-lg text-content-muted hover:bg-red-500/20 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                          title="Eliminar"
                                        >
                                          {deletingRow === row._id ? (
                                            <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                          ) : (
                                            Icons.trash
                                          )}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {/* Footer de la tabla */}
                        <div className="px-5 py-3 bg-surface-200/50 border-t border-surface-300/50 flex items-center justify-between">
                          <span className="text-xs text-content-muted">
                            Mostrando {filteredData.length}{dataSearchQuery ? ` de ${tableData.length}` : ''} registros
                          </span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={exportToCSV}
                              className="px-3 py-1.5 rounded-lg text-xs text-content-muted hover:text-content-primary hover:bg-surface-300 transition-all"
                            >
                              Exportar CSV
                            </button>
                            <button 
                              onClick={exportToJSON}
                              className="px-3 py-1.5 rounded-lg text-xs text-content-muted hover:text-content-primary hover:bg-surface-300 transition-all"
                            >
                              Exportar JSON
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botón de ayuda flotante */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30 hover:bg-primary-400 hover:scale-110 transition-all flex items-center justify-center z-40"
        title="Ayuda"
      >
        {Icons.help}
      </button>

      {/* Modal de ayuda */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-surface-50 border border-surface-300/50 animate-scale-in">
            <div className="px-6 py-4 flex items-center justify-between border-b border-surface-300/50">
              <h2 className="text-lg font-semibold text-content-primary">¿Cómo funcionan las Tablas?</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-200 transition-all"
              >
                {Icons.close}
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/10">
                <h3 className="text-primary-400 font-medium mb-2 flex items-center gap-2">{Icons.table} ¿Qué es una tabla?</h3>
                <p className="text-sm text-primary-400/70">
                  Una tabla es donde guardas información estructurada. Por ejemplo: clientes, reservas, productos, citas médicas, etc.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-content-primary font-medium flex items-center gap-2">{Icons.lightbulb} Tipos de campos</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-surface-100 border border-surface-300/50">
                    <span className="text-primary-400 font-medium">Texto</span>
                    <p className="text-content-muted mt-1">Nombres, descripciones</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-100 border border-surface-300/50">
                    <span className="text-accent-400 font-medium">Número</span>
                    <p className="text-content-muted mt-1">Cantidades, precios</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-100 border border-surface-300/50">
                    <span className="text-amber-400 font-medium">Fecha</span>
                    <p className="text-content-muted mt-1">Citas, reservaciones</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-100 border border-surface-300/50">
                    <span className="text-pink-400 font-medium">Selección</span>
                    <p className="text-content-muted mt-1">Estados, categorías</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-accent-500/5 border border-accent-500/10">
                <h3 className="text-accent-400 font-medium mb-2">Pasos rápidos</h3>
                <ol className="text-sm text-accent-400/70 space-y-1 list-decimal list-inside">
                  <li>Haz clic en "Nueva tabla"</li>
                  <li>Elige una plantilla o crea desde cero</li>
                  <li>Define los campos que necesitas</li>
                  <li>¡Listo! El chatbot ya puede usarla</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de confirmación */}
      {ConfirmModal}
    </div>
  );
}
