import { useContext, useEffect, useState, useCallback } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { 
  listViews, 
  listViewTypes, 
  listTables, 
  analyzeViewMapping,
  createView,
  deleteView,
  getViewData 
} from "../api/client";
import { useToast, useConfirm } from "../components/Toast";
import CalendarView from "../components/views/CalendarView";
import KanbanView from "../components/views/KanbanView";
import FloorPlanView from "../components/views/FloorPlanView";
import POSView from "../components/views/POSView";
import CardsView from "../components/views/CardsView";
import TableView from "../components/views/TableView";
import ViewCreatorInline from "../components/views/ViewCreatorInline";

// Iconos SVG
const Icons = {
  views: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  plus: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  calendar: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  kanban: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>,
  timeline: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>,
  cards: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.5l9 5.25 9-5.25M2.25 7.5l9-5.25 9 5.25M2.25 7.5v9l9 5.25M21.75 7.5v9l-9 5.25M12 12.75l9-5.25M12 12.75l-9-5.25M12 12.75V21" /></svg>,
  table: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125" /></svg>,
  trash: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  close: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  back: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  refresh: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
  warning: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  empty: <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
};

const VIEW_ICONS = {
  calendar: Icons.calendar,
  kanban: Icons.kanban,
  timeline: Icons.timeline,
  cards: Icons.cards,
  table: Icons.table,
  floorplan: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>,
  pos: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
};

export default function Views() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  
  // State
  const [views, setViews] = useState([]);
  const [viewTypes, setViewTypes] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Configurator state
  const [showCreator, setShowCreator] = useState(false);
  
  // View display state
  const [selectedView, setSelectedView] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [loadingViewData, setLoadingViewData] = useState(false);
  
  // Cargar datos iniciales
  useEffect(() => {
    if (!workspaceId) return;
    
    setLoading(true);
    setError(null);
    
    Promise.all([
      listViews(workspaceId),
      listViewTypes(),
      listTables(workspaceId),
    ])
      .then(([viewsRes, typesRes, tablesRes]) => {
        setViews(viewsRes.data || []);
        setViewTypes(typesRes.data || []);
        setTables(tablesRes.data || []);
      })
      .catch((err) => {
        setError(err.message);
        toast.error("Error cargando vistas");
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);
  
  // Cargar datos de una vista
  const loadViewData = useCallback(async (view) => {
    if (!workspaceId || !view) return;
    
    setLoadingViewData(true);
    try {
      const res = await getViewData(view._id, workspaceId);
      setViewData(res.data);
    } catch (err) {
      toast.error("Error cargando datos de la vista");
      console.error(err);
    } finally {
      setLoadingViewData(false);
    }
  }, [workspaceId, toast]);
  
  // Seleccionar una vista
  const handleSelectView = useCallback((view) => {
    setSelectedView(view);
    loadViewData(view);
  }, [loadViewData]);
  
  // Crear nueva vista
  const handleCreateView = async (viewConfig) => {
    try {
      const res = await createView({
        workspaceId,
        ...viewConfig,
      });
      setViews((prev) => [...prev, res.data]);
      setShowCreator(false);
      toast.success(`Vista "${viewConfig.name}" creada correctamente`);
      handleSelectView(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Error al crear vista");
      throw err;
    }
  };
  
  // Eliminar vista
  const handleDeleteView = async (view) => {
    const confirmed = await confirm({
      title: "Eliminar vista",
      message: `¿Estás seguro de eliminar la vista "${view.name}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    
    if (!confirmed) return;
    
    try {
      await deleteView(view._id, workspaceId);
      setViews((prev) => prev.filter((v) => v._id !== view._id));
      if (selectedView?._id === view._id) {
        setSelectedView(null);
        setViewData(null);
      }
      toast.success("Vista eliminada");
    } catch (err) {
      toast.error("Error al eliminar vista");
    }
  };
  
  // Volver a lista de vistas
  const handleBackToList = () => {
    setSelectedView(null);
    setViewData(null);
  };
  
  // Renderizar la vista según su tipo
  const renderViewContent = () => {
    if (!selectedView || !viewData) return null;
    
    switch (selectedView.type) {
      case 'calendar':
        return (
          <CalendarView 
            view={selectedView}
            data={viewData.data}
            meta={viewData.meta}
            onRefresh={() => loadViewData(selectedView)}
          />
        );
      case 'kanban':
        return (
          <KanbanView 
            view={selectedView}
            data={viewData.data}
            meta={viewData.meta}
            onRefresh={() => loadViewData(selectedView)}
          />
        );
      case 'cards':
        return (
          <CardsView 
            view={selectedView}
            data={viewData.data}
            meta={viewData.meta}
            onRefresh={() => loadViewData(selectedView)}
          />
        );
      case 'table':
        return (
          <TableView 
            view={selectedView}
            data={viewData.data}
            meta={viewData.meta}
            onRefresh={() => loadViewData(selectedView)}
          />
        );
      case 'floorplan':
        return (
          <FloorPlanView 
            data={viewData.data}
            fieldMap={viewData.meta?.fieldMap || {}}
            viewConfig={selectedView.viewConfig}
            onRefresh={() => loadViewData(selectedView)}
          />
        );
      case 'pos':
        return (
          <POSView 
            view={selectedView}
            data={viewData.data}
            products={viewData.products}
            productsByCategory={viewData.productsByCategory}
            workspaceId={workspaceId}
            onRefresh={() => loadViewData(selectedView)}
          />
        );
      case 'timeline':
        // TODO: Implementar TimelineView
        return (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>Vista Timeline próximamente disponible</p>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>Vista tipo "{selectedView.type}" no reconocida</p>
          </div>
        );
    }
  };
  
  // --- Render ---
  
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
        <span className="text-slate-500">{Icons.views}</span>
        <p>Selecciona un workspace para ver las vistas</p>
      </div>
    );
  }
  
  // Vista detallada
  if (selectedView) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToList}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {Icons.back}
            </button>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: selectedView.color || '#4F46E5' }}
              >
                {VIEW_ICONS[selectedView.type] || Icons.views}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-100">{selectedView.name}</h1>
                <p className="text-sm text-slate-400">
                  {selectedView.tableName || 'Tabla vinculada'} • {viewTypes.find(t => t.type === selectedView.type)?.name || selectedView.type}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadViewData(selectedView)}
              disabled={loadingViewData}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm transition-colors disabled:opacity-50"
            >
              <span className={loadingViewData ? 'animate-spin' : ''}>{Icons.refresh}</span>
              Actualizar
            </button>
            <button
              onClick={() => handleDeleteView(selectedView)}
              className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="Eliminar vista"
            >
              {Icons.trash}
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loadingViewData ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : !selectedView.enabled ? (
            <div className="flex flex-col items-center justify-center h-64 text-amber-400 gap-4">
              {Icons.warning}
              <p className="text-center">
                Esta vista está deshabilitada.<br/>
                <span className="text-slate-400 text-sm">El mapeo puede estar desactualizado debido a cambios en la tabla.</span>
              </p>
            </div>
          ) : (
            renderViewContent()
          )}
        </div>
        
        {ConfirmModal}
      </div>
    );
  }
  
  // Lista de vistas
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            {Icons.views}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Vistas</h1>
            <p className="text-sm text-slate-400">
              Visualiza tus datos de diferentes formas • {workspaceName}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreator(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
        >
          {Icons.plus}
          Nueva Vista
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-400 gap-2">
            <p>Error: {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-sm text-indigo-400 hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : views.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
            <span className="text-slate-600">{Icons.empty}</span>
            <div className="text-center">
              <p className="text-lg font-medium text-slate-300 mb-1">No hay vistas configuradas</p>
              <p className="text-sm text-slate-500 mb-4">
                Crea una vista para visualizar tus datos de forma personalizada
              </p>
              <button
                onClick={() => setShowCreator(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-sm transition-colors"
              >
                {Icons.plus}
                Crear primera vista
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {views.map((view) => (
              <div
                key={view._id}
                className="group relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/50 transition-all cursor-pointer"
                onClick={() => handleSelectView(view)}
              >
                {/* Icon */}
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: view.color || '#4F46E5' }}
                  >
                    {VIEW_ICONS[view.type] || Icons.views}
                  </div>
                  {!view.enabled && (
                    <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs">
                      Deshabilitada
                    </span>
                  )}
                </div>
                
                {/* Info */}
                <h3 className="text-base font-medium text-slate-100 mb-1 group-hover:text-indigo-300 transition-colors">
                  {view.name}
                </h3>
                <p className="text-sm text-slate-400 mb-2">
                  {view.tableName || 'Tabla vinculada'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-md bg-slate-700/50 text-slate-400 text-xs capitalize">
                    {viewTypes.find(t => t.type === view.type)?.name || view.type}
                  </span>
                </div>
                
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteView(view);
                  }}
                  className="absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                  title="Eliminar vista"
                >
                  {Icons.trash}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Inline Creator */}
      {showCreator && (
        <div className="fixed inset-0 z-50 bg-slate-900">
          <ViewCreatorInline
            workspaceId={workspaceId}
            tables={tables}
            viewTypes={viewTypes}
            onCancel={() => setShowCreator(false)}
            onCreate={handleCreateView}
          />
        </div>
      )}
      
      {ConfirmModal}
    </div>
  );
}
