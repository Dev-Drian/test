import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listTables, createTable, updateTable, getTableData, addTableRow, updateTableRow, deleteTableRow } from "../api/client";
import TableBuilder from "../components/TableBuilder";
import ImportModal from "../components/ImportModal";
import { useToast, useConfirm } from "../components/Toast";
import { FieldValidator } from "../utils/FieldValidator";
import { useSocketEvent } from "../hooks/useSocket";
import { 
  Table2, Plus, X, Check, Rows3, Tags, Inbox, HelpCircle, Lightbulb, 
  Search, Download, Code2, Pencil, Trash2, AlertCircle, ArrowLeft,
  Database, Settings, Upload, FileJson, FileSpreadsheet, MoreVertical,
  ChevronRight, Sparkles, Layers
} from "lucide-react";

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
  const [fieldErrors, setFieldErrors] = useState({}); // Errores por campo

  // Search & Edit state
  const [searchQuery, setSearchQuery] = useState("");
  const [dataSearchQuery, setDataSearchQuery] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingRow, setDeletingRow] = useState(null);
  const [editFieldErrors, setEditFieldErrors] = useState({}); // Errores de edición
  
  // Edit table structure state
  const [editingTableConfig, setEditingTableConfig] = useState(null);
  const [updatingTable, setUpdatingTable] = useState(false);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);

  // Payment flash: { [recordId]: { amount, currency, ts } } — resalta la fila 8s al confirmar pago
  const [paymentFlash, setPaymentFlash] = useState({});

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    listTables(workspaceId)
      .then((res) => setTables(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // WebSocket: registros en tiempo real (el agente crea/edita sin recargar)
  useSocketEvent('record:created', ({ tableId, record }) => {
    if (tableId === selectedTable?._id && record) {
      setTableData(prev => {
        const alreadyExists = prev.some(r => r._id === record._id);
        if (alreadyExists) return prev;
        return [record, ...prev];
      });
    }
  });

  useSocketEvent('record:updated', ({ tableId, record }) => {
    if (tableId === selectedTable?._id && record) {
      setTableData(prev => prev.map(r => r._id === record._id ? record : r));
    }
  });

  // Pago confirmado por Wompi webhook → actualizar estadoPago + flash verde 8s en la fila
  useSocketEvent('payment:confirmed', ({ tableId, recordId, amount, currency }) => {
    if (tableId === selectedTable?._id) {
      setTableData(prev => prev.map(r =>
        r._id === recordId ? { ...r, estadoPago: 'pagado' } : r
      ));
      setPaymentFlash(prev => ({ ...prev, [recordId]: { amount, currency, ts: Date.now() } }));
      setTimeout(() => setPaymentFlash(prev => { const n = { ...prev }; delete n[recordId]; return n; }), 8000);
    }
    const amt = amount ? `$${Number(amount).toLocaleString('es-CO')} ${currency || 'COP'}` : '';
    toast.success(`Pago confirmado${amt ? `: ${amt}` : ''}`);
  });

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

  // Validar un campo individual mientras escribe
  const validateField = (key, value) => {
    if (!selectedTable?.headers) return;
    const header = selectedTable.headers.find(h => h.key === key);
    if (!header) return;
    
    const result = FieldValidator.validate(key, value, header);
    setFieldErrors(prev => ({
      ...prev,
      [key]: result.valid ? null : result.error
    }));
  };

  const handleAddRow = async (e) => {
    e.preventDefault();
    if (!workspaceId || !selectedTable) return;
    
    // Validar todos los campos antes de enviar
    const validation = FieldValidator.validateAll(rowForm, selectedTable.headers || []);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      setRowError(firstError);
      toast.error(firstError);
      return;
    }
    
    setRowError("");
    setFieldErrors({});
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
    setEditFieldErrors({});
  };

  // Validar campo en edición
  const validateEditField = (key, value) => {
    if (!selectedTable?.headers) return;
    const header = selectedTable.headers.find(h => h.key === key);
    if (!header) return;
    
    const result = FieldValidator.validate(key, value, header);
    setEditFieldErrors(prev => ({
      ...prev,
      [key]: result.valid ? null : result.error
    }));
  };

  const handleSaveEdit = async () => {
    if (!workspaceId || !selectedTable || !editingRow) return;
    
    // Filtrar campos internos para validación
    const { _id, _rev, tableId, createdAt, updatedAt, ...data } = editForm;
    
    // Validar antes de guardar
    const validation = FieldValidator.validateAll(data, selectedTable.headers || []);
    if (!validation.valid) {
      setEditFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError);
      return;
    }
    
    setSavingEdit(true);
    setEditFieldErrors({});
    try {
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
    setEditFieldErrors({});
  };

  // Actualizar configuración de la tabla (solo si está vacía)
  const handleUpdateTable = async (tableConfig) => {
    if (!workspaceId || !editingTableConfig) return;
    setUpdatingTable(true);
    try {
      const res = await updateTable(workspaceId, editingTableConfig._id, tableConfig);
      // Actualizar la tabla en la lista local
      setTables((prev) => prev.map(t => t._id === editingTableConfig._id ? res.data : t));
      // Si es la tabla seleccionada, actualizar también
      if (selectedTable?._id === editingTableConfig._id) {
        setSelectedTable(res.data);
      }
      setEditingTableConfig(null);
      toast.success(`Tabla "${tableConfig.name}" actualizada correctamente`);
    } catch (err) {
      if (err.response?.data?.hasData) {
        toast.error("No se puede modificar la estructura porque la tabla tiene datos.");
      } else {
        toast.error(`Error al actualizar: ${err.response?.data?.error || err.message}`);
      }
    } finally {
      setUpdatingTable(false);
    }
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
      <div className="flex items-center justify-center h-full" style={{ background: '#0f172a' }}>
        <div className="text-center animate-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/15 flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <Table2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 mb-2">Tablas</h1>
          <p className="text-slate-400 mb-6 max-w-sm">
            Selecciona un workspace para gestionar sus tablas
          </p>
          <Link 
            to="/workspaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors"
          >
            Ir a Workspaces
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: '#0f172a' }}>
        <div className="max-w-7xl mx-auto">
          {/* Skeleton Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-700 animate-pulse" />
              <div>
                <div className="h-6 w-32 bg-slate-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-slate-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-10 w-32 bg-slate-700 rounded-lg animate-pulse" />
          </div>
          
          {/* Skeleton Content */}
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-3">
              <div className="p-5 rounded-2xl" style={{ background: 'rgba(51, 65, 85, 0.4)', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
                <div className="h-5 w-20 bg-slate-700 rounded animate-pulse mb-4" />
                <div className="h-10 w-full bg-slate-700/50 rounded-xl animate-pulse mb-5" />
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 rounded-xl bg-slate-700/30 animate-pulse h-20" />
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-9">
              <div className="h-[500px] rounded-2xl bg-slate-700/30 animate-pulse" style={{ border: '1px solid rgba(100, 116, 139, 0.3)' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }} data-tour="tables-welcome">
      {/* Modal de creación - Rediseñado */}
      {showBuilder && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
            style={{ 
              background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 100px rgba(139, 92, 246, 0.15)'
            }}>
            <div className="sticky top-0 px-6 py-5 flex items-center justify-between z-10" 
              style={{ 
                background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.95) 0%, rgba(10, 10, 15, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
              <div>
                <h2 className="text-xl font-bold text-white">Crear nueva tabla</h2>
                <p className="text-sm text-slate-400 mt-1">Define la estructura de tus datos</p>
              </div>
              <button
                onClick={() => setShowBuilder(false)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
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
      
      {/* Modal para EDITAR tabla existente - Rediseñado */}
      {editingTableConfig && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ 
              background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
            }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h2 className="text-lg font-bold text-white">Editar configuración de "{editingTableConfig.name}"</h2>
              <button
                onClick={() => setEditingTableConfig(null)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <TableBuilder
                editTable={editingTableConfig}
                onSave={handleUpdateTable}
                onCancel={() => setEditingTableConfig(null)}
                availableTables={tables.filter(t => t._id !== editingTableConfig._id)}
                loading={updatingTable}
              />
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="max-w-full mx-auto">
          
          {/* Header - Rediseñado */}
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 blur-lg opacity-50" />
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl text-white">
                    <Table2 className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Tablas</h1>
                  <p className="text-slate-400 text-sm">
                    Gestiona los datos de <span className="text-violet-400 font-medium">{workspaceName}</span>
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowBuilder(true)}
                data-tour="tables-create"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  boxShadow: '0 6px 20px rgba(139, 92, 246, 0.35)'
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Nueva tabla</span>
              </button>
            </div>
          </header>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-fade-up">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-400">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Sin tablas - Rediseñado */}
          {tables.length === 0 ? (
            <div className="relative text-center py-24 rounded-3xl animate-fade-up overflow-hidden" 
              style={{ 
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)', 
                border: '1px solid rgba(99, 102, 241, 0.2)' 
              }}>
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl" />
              </div>
              
              <div className="relative z-10">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 blur-xl opacity-40" />
                  <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl">
                    <Database className="w-12 h-12 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No hay tablas aún</h3>
                <p className="text-slate-400 mb-10 max-w-md mx-auto text-base">
                  Las tablas te permiten almacenar y organizar los datos de tu negocio de forma estructurada
                </p>
                <button 
                  onClick={() => setShowBuilder(true)}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0 15px 40px rgba(99, 102, 241, 0.4)'
                  }}
                >
                  <Sparkles className="w-5 h-5" />
                  Crear mi primera tabla
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-5 animate-fade-up">
              {/* Sidebar - Lista de tablas */}
              <div className="col-span-12 lg:col-span-2" data-tour="tables-list">
                <div className="sticky top-6">
                  <div className="rounded-xl overflow-hidden" 
                    style={{ 
                      background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)', 
                      border: '1px solid rgba(100, 116, 139, 0.2)',
                      backdropFilter: 'blur(20px)'
                    }}>
                    {/* Header del sidebar */}
                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(100, 116, 139, 0.2)' }}>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-xs font-bold text-white">Mis Tablas</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ 
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          color: 'white'
                        }}>
                        {tables.length}
                      </span>
                    </div>
                    
                    <div className="p-3">
                      {/* Barra de búsqueda de tablas */}
                      <div className="relative mb-3">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                          <Search className="w-3.5 h-3.5" />
                        </div>
                        <input 
                          type="text" 
                          placeholder="Buscar..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                          style={{ 
                            background: 'rgba(15, 23, 42, 0.6)', 
                            border: '1px solid rgba(100, 116, 139, 0.2)' 
                          }}
                        />
                      </div>
                      
                      <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                        {tables.filter(t => !searchQuery.trim() || t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((t, index) => (
                        <button
                          key={t._id}
                          onClick={() => setSelectedTable(t)}
                          className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 group flex items-center gap-2.5 ${
                            selectedTable?._id === t._id
                              ? "ring-1 ring-indigo-500/50"
                              : "hover:bg-slate-700/40"
                          }`}
                          style={{ 
                            background: selectedTable?._id === t._id 
                              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)'
                              : 'transparent',
                            animation: 'fade-up 0.3s ease-out forwards',
                            animationDelay: `${index * 40}ms`,
                            opacity: 0
                          }}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 ${
                            selectedTable?._id === t._id 
                              ? 'text-indigo-400' 
                              : 'text-slate-500 group-hover:text-slate-300'
                          }`}
                          style={{
                            background: selectedTable?._id === t._id 
                              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.2) 100%)'
                              : 'rgba(51, 65, 85, 0.5)'
                          }}>
                            <Table2 className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`block font-medium text-xs truncate transition-colors ${
                              selectedTable?._id === t._id ? 'text-white' : 'text-slate-300 group-hover:text-white'
                            }`}>
                              {t.name}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Tags className="w-2.5 h-2.5" />
                              {t.headers?.length || 0} campos
                            </span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 transition-all duration-200 ${
                            selectedTable?._id === t._id 
                              ? 'text-indigo-400 opacity-100' 
                              : 'text-slate-600 opacity-0 group-hover:opacity-100'
                          }`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Main content - Datos de la tabla */}
              <div className="col-span-12 lg:col-span-10" data-tour="tables-data">
                {!selectedTable ? (
                  <div className="relative h-[500px] flex items-center justify-center rounded-2xl overflow-hidden" 
                    style={{ 
                      background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)', 
                      border: '1px solid rgba(100, 116, 139, 0.2)' 
                    }}>
                    {/* Decorative pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0" style={{ 
                        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
                        backgroundSize: '40px 40px'
                      }} />
                    </div>
                    <div className="text-center z-10">
                      <div className="relative w-24 h-24 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-2xl bg-slate-600/30 blur-xl" />
                        <div className="relative w-full h-full rounded-2xl flex items-center justify-center" 
                          style={{ 
                            background: 'linear-gradient(135deg, rgba(71, 85, 105, 0.6) 0%, rgba(51, 65, 85, 0.4) 100%)',
                            border: '1px solid rgba(100, 116, 139, 0.3)'
                          }}>
                          <ArrowLeft className="w-8 h-8 text-slate-400" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">Selecciona una tabla</h3>
                      <p className="text-slate-400 max-w-sm mx-auto">
                        Elige una tabla del panel izquierdo para visualizar y gestionar sus registros
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden shadow-2xl" 
                    style={{ 
                      background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)', 
                      border: '1px solid rgba(100, 116, 139, 0.2)',
                      backdropFilter: 'blur(20px)'
                    }}>
                    {/* Table header */}
                    <div className="relative p-5" style={{ borderBottom: '1px solid rgba(100, 116, 139, 0.2)' }}>
                      <div className="relative flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 blur-md opacity-40" />
                            <div className="relative w-11 h-11 rounded-lg flex items-center justify-center text-white shadow-lg"
                              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                              <Table2 className="w-5 h-5" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white mb-0.5">{selectedTable.name}</h3>
                            <p className="text-xs text-slate-400">
                              {selectedTable.description || "Gestiona los registros"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Botones de exportación */}
                          {tableData.length > 0 && (
                            <div className="flex items-center gap-1.5 mr-2">
                              <button
                                onClick={exportToCSV}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                style={{ border: '1px solid rgba(100, 116, 139, 0.2)' }}
                                title="Exportar a CSV"
                              >
                                <FileSpreadsheet className="w-4 h-4" />
                                CSV
                              </button>
                              <button
                                onClick={exportToJSON}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                                style={{ border: '1px solid rgba(100, 116, 139, 0.2)' }}
                                title="Exportar a JSON"
                              >
                                <FileJson className="w-4 h-4" />
                                JSON
                              </button>
                              <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-sky-400 hover:text-sky-300 hover:bg-sky-500/15 transition-all"
                                style={{ border: '1px solid rgba(56, 189, 248, 0.3)' }}
                                title="Importar desde CSV"
                              >
                                <Upload className="w-4 h-4" />
                                Importar
                              </button>
                            </div>
                          )}
                          {/* Botón editar configuración (solo si tabla vacía) */}
                          {tableData.length === 0 && (
                            <button
                              onClick={() => setEditingTableConfig(selectedTable)}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-600/40 transition-all mr-2"
                              style={{ border: '1px solid rgba(100, 116, 139, 0.3)' }}
                              title="Editar estructura de la tabla"
                            >
                              <Pencil className="w-4 h-4" />
                              <span>Editar config</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowAddRow(!showAddRow);
                              setRowForm({});
                              setRowError("");
                            }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                              showAddRow 
                                ? 'bg-slate-600/50 text-slate-300 hover:bg-slate-600' 
                                : 'bg-sky-500 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/30'
                            }`}
                          >
                            {showAddRow ? (
                              <>
                                <X className="w-4 h-4" />
                                <span>Cancelar</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>Nuevo registro</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Stats cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="relative p-3 rounded-lg overflow-hidden group hover:scale-[1.02] transition-transform" 
                          style={{ 
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)', 
                            border: '1px solid rgba(99, 102, 241, 0.2)' 
                          }}>
                          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                          <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 rounded-md text-indigo-400" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0.1) 100%)' }}>
                                <Rows3 className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Registros</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{filteredData.length}{dataSearchQuery && <span className="text-sm text-slate-500 ml-1">/ {tableData.length}</span>}</p>
                          </div>
                        </div>
                        
                        <div className="relative p-3 rounded-lg overflow-hidden group hover:scale-[1.02] transition-transform" 
                          style={{ 
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)', 
                            border: '1px solid rgba(139, 92, 246, 0.2)' 
                          }}>
                          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/20 transition-all" />
                          <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 rounded-md text-violet-400" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.1) 100%)' }}>
                                <Tags className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Campos</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{selectedTable.headers?.length || 0}</p>
                          </div>
                        </div>
                        
                        <div className="relative p-3 rounded-lg overflow-hidden group hover:scale-[1.02] transition-transform" 
                          style={{ 
                            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)', 
                            border: '1px solid rgba(14, 165, 233, 0.2)' 
                          }}>
                          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-sky-500/10 blur-2xl group-hover:bg-sky-500/20 transition-all" />
                          <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 rounded-md text-sky-400" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.3) 0%, rgba(14, 165, 233, 0.1) 100%)' }}>
                                <Check className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Requeridos</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{selectedTable.headers?.filter(h => h.required)?.length || 0}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Barra de búsqueda de datos */}
                      {tableData.length > 0 && (
                        <div className="mt-4 relative">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                            <Search className="w-3.5 h-3.5" />
                          </div>
                          <input 
                            type="text" 
                            placeholder="Buscar en registros..."
                            value={dataSearchQuery}
                            onChange={(e) => setDataSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                            style={{ 
                              background: 'rgba(15, 23, 42, 0.6)', 
                              border: '1px solid rgba(100, 116, 139, 0.2)' 
                            }}
                          />
                          {dataSearchQuery && (
                            <button 
                              onClick={() => setDataSearchQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-600/50 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Add row form */}
                    {showAddRow && (
                      <div className="p-4" style={{ background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(100, 116, 139, 0.3)' }}>
                        <form onSubmit={handleAddRow}>
                          <h4 className="text-sm font-medium text-slate-300 mb-3">Nueva fila</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                            {getVisibleHeaders().map((header) => (
                              <div key={header.key}>
                                <label className="text-[11px] text-slate-500 block mb-1">
                                  {header.label}
                                  {header.required && <span className="text-red-400 ml-1">*</span>}
                                </label>
                                <input
                                  type={header.type === "number" || header.type === "integer" || header.type === "currency" ? "number" : header.type === "date" ? "date" : header.type === "time" ? "time" : header.type === "email" ? "email" : "text"}
                                  value={rowForm[header.key] || ""}
                                  onChange={(e) => {
                                    setRowForm({ ...rowForm, [header.key]: e.target.value });
                                    validateField(header.key, e.target.value);
                                  }}
                                  onBlur={(e) => validateField(header.key, e.target.value)}
                                  placeholder={header.placeholder || header.label}
                                  className={`w-full px-3 py-2.5 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                                    fieldErrors[header.key] 
                                      ? 'ring-2 ring-red-500/50 focus:ring-red-500/50' 
                                      : 'focus:ring-indigo-500/30'
                                  }`}
                                  style={{ 
                                    background: 'rgba(71, 85, 105, 0.4)', 
                                    border: fieldErrors[header.key] ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(100, 116, 139, 0.3)' 
                                  }}
                                  min={header.type === "number" && header.validation?.min !== undefined ? header.validation.min : undefined}
                                  max={header.type === "number" && header.validation?.max !== undefined ? header.validation.max : undefined}
                                  step={header.type === "integer" ? "1" : header.type === "currency" ? "0.01" : undefined}
                                />
                                {fieldErrors[header.key] && (
                                  <p className="text-xs text-red-400 mt-1">{fieldErrors[header.key]}</p>
                                )}
                                {header.helpText && !fieldErrors[header.key] && (
                                  <p className="text-xs text-slate-500 mt-1">{header.helpText}</p>
                                )}
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
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-medium hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {addingRow ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Guardando...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>Guardar</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowAddRow(false); setFieldErrors({}); setRowError(""); }}
                              className="px-4 py-2 rounded-lg text-slate-400 text-sm font-medium hover:bg-slate-600/50 hover:text-slate-200 transition-all"
                              style={{ border: '1px solid rgba(100, 116, 139, 0.3)' }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Table data */}
                    {loadingData ? (
                      <div className="p-16 text-center">
                        <div className="relative w-12 h-12 mx-auto mb-4">
                          <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
                          <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-sm text-slate-400">Cargando datos...</p>
                      </div>
                    ) : tableData.length === 0 ? (
                      <div className="relative p-20 text-center overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl" />
                        </div>
                        
                        <div className="relative z-10">
                          <div className="relative w-20 h-20 mx-auto mb-8">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 blur-lg opacity-50" />
                            <div className="relative w-full h-full rounded-2xl flex items-center justify-center"
                              style={{ 
                                background: 'linear-gradient(135deg, rgba(71, 85, 105, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)',
                                border: '1px solid rgba(100, 116, 139, 0.3)' 
                              }}>
                              <Inbox className="w-9 h-9 text-slate-400" />
                            </div>
                          </div>
                          <h4 className="text-xl text-white font-bold mb-3">Tabla vacía</h4>
                          <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto">
                            No hay registros en esta tabla aún. Comienza agregando tu primer registro o importa datos desde un archivo CSV.
                          </p>
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => setShowAddRow(true)}
                              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-300 hover:scale-105"
                              style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                boxShadow: '0 10px 30px rgba(99, 102, 241, 0.35)'
                              }}
                            >
                              <Plus className="w-5 h-5" />
                              Agregar registro
                            </button>
                            <button
                              onClick={() => setShowImportModal(true)}
                              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sky-400 text-sm font-semibold hover:text-white hover:bg-sky-500/20 transition-all"
                              style={{ border: '1px solid rgba(56,189,248,0.3)' }}
                            >
                              <Upload className="w-4 h-4" />
                              Importar CSV
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full" style={{ minWidth: '800px' }}>
                          <thead>
                            <tr style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)' }}>
                              <th className="text-center py-4 px-3 text-slate-500 font-bold text-[10px] uppercase tracking-wider w-12" style={{ borderBottom: '2px solid rgba(139, 92, 246, 0.3)' }}>#</th>
                              {Object.keys(tableData[0])
                                .filter((k) => !k.startsWith("_") && k !== "main" && k !== "tableId" && k !== "createdAt" && k !== "updatedAt")
                                .map((k, idx) => (
                                  <th
                                    key={k}
                                    className="text-left py-4 px-5 font-bold text-[11px] uppercase tracking-wider"
                                    style={{ 
                                      minWidth: '140px', 
                                      color: idx === 0 ? '#a5b4fc' : '#94a3b8',
                                      borderBottom: '2px solid rgba(139, 92, 246, 0.3)',
                                      background: idx === 0 ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                                    }}
                                  >
                                    {k}
                                  </th>
                                ))}
                              <th className="text-center py-4 px-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider w-28" style={{ borderBottom: '2px solid rgba(139, 92, 246, 0.3)' }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredData.map((row, i) => (
                              <tr
                                key={row._id || i}
                                className={`transition-all duration-200 group cursor-pointer ${
                                  editingRow === row._id
                                    ? 'bg-indigo-500/15 shadow-lg shadow-indigo-500/10'
                                    : paymentFlash[row._id]
                                      ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40 animate-pulse'
                                      : 'hover:bg-gradient-to-r hover:from-violet-500/5 hover:to-transparent'
                                }`}
                                style={{ borderBottom: '1px solid rgba(100, 116, 139, 0.12)' }}
                              >
                                <td className="py-4 px-3 text-center">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold transition-all group-hover:scale-110" 
                                    style={{ 
                                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                      color: '#a5b4fc'
                                    }}>
                                    {i + 1}
                                  </span>
                                </td>
                                {Object.keys(tableData[0])
                                  .filter((k) => !k.startsWith("_") && k !== "main" && k !== "tableId" && k !== "createdAt" && k !== "updatedAt")
                                  .map((k, idx) => {
                                    const header = selectedTable?.headers?.find(h => h.key === k);
                                    const isFirstCol = idx === 0;
                                    const isNumeric = header?.type === 'number' || header?.type === 'integer' || header?.type === 'currency';
                                    const isEmail = header?.type === 'email';
                                    return (
                                    <td key={k} 
                                      className={`py-4 px-5 text-sm transition-all duration-200 ${isFirstCol ? 'font-semibold text-white' : 'text-slate-400 group-hover:text-slate-200'}`}
                                      style={{ 
                                        minWidth: '140px',
                                        background: isFirstCol ? 'rgba(99, 102, 241, 0.03)' : 'transparent'
                                      }}>
                                      {editingRow === row._id ? (
                                        <div>
                                          <input
                                            type={header?.type === "number" || header?.type === "integer" || header?.type === "currency" ? "number" : header?.type === "date" ? "date" : header?.type === "time" ? "time" : header?.type === "email" ? "email" : "text"}
                                            value={editForm[k] ?? ""}
                                            onChange={(e) => {
                                              setEditForm({ ...editForm, [k]: e.target.value });
                                              if (header) validateEditField(k, e.target.value);
                                            }}
                                            onBlur={(e) => header && validateEditField(k, e.target.value)}
                                            className={`w-full px-2 py-1.5 rounded text-slate-100 text-sm focus:outline-none focus:ring-2 ${
                                              editFieldErrors[k] ? 'ring-2 ring-red-500/50' : 'focus:ring-indigo-500/30'
                                            }`}
                                            style={{ 
                                              background: 'rgba(71, 85, 105, 0.5)', 
                                              border: editFieldErrors[k] ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(100, 116, 139, 0.4)' 
                                            }}
                                            min={header?.type === "number" && header?.validation?.min !== undefined ? header.validation.min : undefined}
                                            max={header?.type === "number" && header?.validation?.max !== undefined ? header.validation.max : undefined}
                                          />
                                          {editFieldErrors[k] && (
                                            <p className="text-xs text-red-400 mt-1 truncate" title={editFieldErrors[k]}>{editFieldErrors[k]}</p>
                                          )}
                                        </div>
                                      ) : (
                                        <span className={`block truncate ${isNumeric ? 'font-mono tabular-nums' : ''} ${isEmail ? 'text-sky-400' : ''}`} title={String(row[k] ?? "-")}>
                                          {isNumeric && row[k] != null ? Number(row[k]).toLocaleString('es-CO') : String(row[k] ?? "-")}
                                        </span>
                                      )}
                                    </td>
                                  );})}
                                <td className="py-4 px-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {editingRow === row._id ? (
                                      <>
                                        <button
                                          onClick={handleSaveEdit}
                                          disabled={savingEdit}
                                          className="p-2.5 rounded-xl text-white transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50"
                                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                                          title="Guardar"
                                        >
                                          {savingEdit ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                          ) : (
                                            <Check className="w-4 h-4" />
                                          )}
                                        </button>
                                        <button
                                          onClick={handleCancelEdit}
                                          className="p-2.5 rounded-xl text-slate-300 hover:text-white transition-all duration-200 hover:scale-110"
                                          style={{ background: 'rgba(71, 85, 105, 0.6)', border: '1px solid rgba(100, 116, 139, 0.3)' }}
                                          title="Cancelar"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleEditRow(row)}
                                          className="p-2 rounded-xl text-slate-500 hover:text-indigo-400 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
                                          style={{ background: 'transparent' }}
                                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'}
                                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                          title="Editar"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRow(row)}
                                          disabled={deletingRow === row._id}
                                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 disabled:opacity-50"
                                          style={{ background: 'transparent' }}
                                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                          title="Eliminar"
                                        >
                                          {deletingRow === row._id ? (
                                            <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                          ) : (
                                            <Trash2 className="w-4 h-4" />
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
                        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)', borderTop: '1px solid rgba(139, 92, 246, 0.15)' }}>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                              <Rows3 className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="text-xs font-semibold text-indigo-300">
                                {filteredData.length}{dataSearchQuery ? <span className="text-slate-500"> / {tableData.length}</span> : ''} registros
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={exportToCSV}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-400 transition-all duration-200"
                              style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              Exportar CSV
                            </button>
                            <button 
                              onClick={exportToJSON}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-amber-400 transition-all duration-200"
                              style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                            >
                              <FileJson className="w-3.5 h-3.5" />
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

      {/* Botón de ayuda flotante - Rediseñado */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl text-white shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 10px 40px rgba(99, 102, 241, 0.4)'
        }}
        title="Ayuda"
      >
        <HelpCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      </button>

      {/* Modal de ayuda - Rediseñado */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scale-in" 
            style={{ 
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)', 
              border: '1px solid rgba(100, 116, 139, 0.2)',
              backdropFilter: 'blur(40px)'
            }}>
            <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(100, 116, 139, 0.2)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">¿Cómo funcionan las Tablas?</h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <h3 className="text-indigo-400 font-semibold mb-2 flex items-center gap-2">
                  <Database className="w-5 h-5" /> 
                  ¿Qué es una tabla?
                </h3>
                <p className="text-sm text-slate-300">
                  Una tabla es donde guardas información estructurada. Por ejemplo: clientes, reservas, productos, citas médicas, etc.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" /> 
                  Tipos de campos
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl group hover:scale-[1.02] transition-transform" style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <span className="text-indigo-400 font-semibold">Texto</span>
                    <p className="text-slate-400 mt-1">Nombres, descripciones</p>
                  </div>
                  <div className="p-3 rounded-xl group hover:scale-[1.02] transition-transform" style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <span className="text-sky-400 font-semibold">Número</span>
                    <p className="text-slate-400 mt-1">Cantidades, precios</p>
                  </div>
                  <div className="p-3 rounded-xl group hover:scale-[1.02] transition-transform" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <span className="text-amber-400 font-semibold">Fecha</span>
                    <p className="text-slate-400 mt-1">Citas, reservaciones</p>
                  </div>
                  <div className="p-3 rounded-xl group hover:scale-[1.02] transition-transform" style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                    <span className="text-pink-400 font-semibold">Selección</span>
                    <p className="text-slate-400 mt-1">Estados, categorías</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h3 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Pasos rápidos
                </h3>
                <ol className="text-sm text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">1</span>
                    Haz clic en "Nueva tabla"
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">2</span>
                    Elige una plantilla o crea desde cero
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">3</span>
                    Define los campos que necesitas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">4</span>
                    ¡Listo! El chatbot ya puede usarla
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de confirmación */}
      {ConfirmModal}

      {/* Modal de importación */}
      {showImportModal && selectedTable && (
        <ImportModal
          workspaceId={workspaceId}
          table={selectedTable}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            setLoadingData(true);
            getTableData(workspaceId, selectedTable._id)
              .then((res) => setTableData(res.data || []))
              .catch((err) => toast.error(err.message))
              .finally(() => setLoadingData(false));
          }}
        />
      )}
    </div>
  );
}
