import { useState, useEffect } from 'react';
import { analyzeViewMapping } from '../../api/client';

const Icons = {
  close: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  calendar: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  kanban: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>,
  timeline: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>,
  cards: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.5l9 5.25 9-5.25M2.25 7.5l9-5.25 9 5.25M2.25 7.5v9l9 5.25M21.75 7.5v9l-9 5.25M12 12.75l9-5.25M12 12.75l-9-5.25M12 12.75V21" /></svg>,
  table: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625" /></svg>,
  check: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
  warning: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  error: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>,
  sparkles: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
  arrowRight: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>,
};

const VIEW_ICONS = {
  calendar: Icons.calendar,
  kanban: Icons.kanban,
  timeline: Icons.timeline,
  cards: Icons.cards,
  table: Icons.table,
  floorplan: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>,
  pos: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
};

const VIEW_COLORS = {
  calendar: '#4F46E5',
  kanban: '#0EA5E9',
  timeline: '#8B5CF6',
  cards: '#EC4899',
  table: '#10B981',
  floorplan: '#F97316',
  pos: '#059669',
};

const STEPS = {
  SELECT_TYPE: 0,
  SELECT_TABLE: 1,
  SELECT_SECONDARY: 2, // Para multi-tabla (floorplan, pos)
  SELECT_TERTIARY: 3, // Para POS (productos)
  ANALYZE: 4,
  CONFIGURE: 5,
};

export default function ViewConfigurator({ workspaceId, tables, viewTypes, onClose, onCreate }) {
  const [step, setStep] = useState(STEPS.SELECT_TYPE);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [secondaryTable, setSecondaryTable] = useState(null); // Para multi-tabla
  const [tertiaryTable, setTertiaryTable] = useState(null); // Para POS (productos)
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [viewName, setViewName] = useState('');
  const [fieldMap, setFieldMap] = useState({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  
  // Analizar mapeo cuando se selecciona tabla
  useEffect(() => {
    if (step === STEPS.ANALYZE && selectedType && selectedTable && !analysisResult) {
      analyzeMapping();
    }
  }, [step, selectedType, selectedTable]);
  
  const analyzeMapping = async () => {
    setAnalyzing(true);
    setError(null);
    
    try {
      const res = await analyzeViewMapping({
        workspaceId,
        tableId: selectedTable._id,
        viewType: selectedType.type,
      });
      
      setAnalysisResult(res.data);
      setFieldMap(res.data.fieldMap || {});
      
      // Generar nombre sugerido
      if (!viewName) {
        setViewName(`${selectedType.name} de ${selectedTable.name}`);
      }
      
      // Si el análisis es completo, ir a configurar
      if (res.data.status === 'complete') {
        setStep(STEPS.CONFIGURE);
      }
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al analizar la tabla');
    } finally {
      setAnalyzing(false);
    }
  };
  
  const handleSelectType = (type) => {
    setSelectedType(type);
    setStep(STEPS.SELECT_TABLE);
  };
  
  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setAnalysisResult(null);
    
    // Si es floorplan o pos, mostrar paso para seleccionar tabla secundaria
    if (selectedType?.type === 'floorplan' || selectedType?.type === 'pos' || selectedType?.supportsMultiTable) {
      setStep(STEPS.SELECT_SECONDARY);
    } else {
      setStep(STEPS.ANALYZE);
    }
  };
  
  const handleSelectSecondaryTable = (table) => {
    setSecondaryTable(table);
    
    // Si es POS, necesitamos una tercera tabla para productos
    if (selectedType?.type === 'pos') {
      setStep(STEPS.SELECT_TERTIARY);
    } else {
      setStep(STEPS.ANALYZE);
    }
  };
  
  const handleSelectTertiaryTable = (table) => {
    setTertiaryTable(table);
    setStep(STEPS.ANALYZE);
  };
  
  const skipSecondaryTable = () => {
    setSecondaryTable(null);
    setTertiaryTable(null);
    setStep(STEPS.ANALYZE);
  };
  
  const skipTertiaryTable = () => {
    setTertiaryTable(null);
    setStep(STEPS.ANALYZE);
  };
  
  const handleFieldMapChange = (viewField, tableField) => {
    setFieldMap(prev => ({
      ...prev,
      [viewField]: tableField || null,
    }));
  };
  
  const handleCreate = async () => {
    if (!viewName.trim()) {
      setError('Ingresa un nombre para la vista');
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      const viewData = {
        name: viewName.trim(),
        type: selectedType.type,
        tableId: selectedTable._id,
        fieldMap,
        color: VIEW_COLORS[selectedType.type] || '#4F46E5',
        icon: selectedType.icon,
        mappingMetadata: analysisResult?.mappingMetadata,
      };
      
      // Agregar configuración multi-tabla si hay tabla secundaria
      if (secondaryTable) {
        viewData.tables = {
          primary: selectedTable._id,
          secondary: secondaryTable._id,
          joinField: 'mesa_id', // Default para floorplan/pos
        };
        
        // Agregar tabla terciaria para POS (productos)
        if (tertiaryTable) {
          viewData.tables.tertiary = tertiaryTable._id;
        }
      }
      
      await onCreate(viewData);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la vista');
      setCreating(false);
    }
  };
  
  const canProceedToCreate = () => {
    if (!selectedType || !selectedTable || !viewName.trim()) return false;
    
    // Verificar campos requeridos
    const requiredFields = selectedType.requiredFields || [];
    return requiredFields.every(field => fieldMap[field]);
  };
  
  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case STEPS.SELECT_TYPE:
        return (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Selecciona cómo quieres visualizar tus datos
            </p>
            <div className="grid grid-cols-2 gap-3">
              {viewTypes.map(type => (
                <button
                  key={type.type}
                  onClick={() => handleSelectType(type)}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl border border-slate-600/50 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-left group"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: VIEW_COLORS[type.type] || '#4F46E5' }}
                  >
                    {VIEW_ICONS[type.type] || Icons.table}
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium text-slate-200 group-hover:text-indigo-300">
                      {type.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {type.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
        
      case STEPS.SELECT_TABLE:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-400">
                {selectedType.name}
              </span>
              <span>→ Selecciona la tabla de datos</span>
            </div>
            
            {tables.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No hay tablas en este workspace</p>
                <p className="text-sm text-slate-500 mt-1">
                  Crea una tabla primero en la sección "Mis datos"
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tables.map(table => (
                  <button
                    key={table._id}
                    onClick={() => handleSelectTable(table)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-600/50 hover:border-indigo-500/50 hover:bg-slate-700/30 transition-all text-left"
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: table.color || '#4F46E5' }}
                    >
                      {table.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-200 truncate">{table.name}</h4>
                      <p className="text-xs text-slate-500">
                        {table.headers?.length || 0} campos
                      </p>
                    </div>
                    <span className="text-slate-600">{Icons.arrowRight}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
        
      case STEPS.SELECT_SECONDARY:
        // Filtrar tablas que podrían ser de reservas/pedidos (no la misma que la primaria)
        const candidateTables = tables.filter(t => t._id !== selectedTable._id);
        const isPOS = selectedType?.type === 'pos';
        
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-400">
                {selectedType.name}
              </span>
              <span>→</span>
              <span className="px-2 py-1 rounded-md bg-slate-700/50 text-slate-300">
                {selectedTable.name}
              </span>
              <span>→ {isPOS ? 'Tabla de pedidos' : 'Tabla de reservas'} {isPOS ? '' : '(opcional)'}</span>
            </div>
            
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-300 text-sm">
                {isPOS 
                  ? 'Selecciona la tabla donde se guardarán los pedidos de cada mesa.'
                  : 'Para calcular el estado de las mesas automáticamente, selecciona la tabla que contiene las reservas.'
                }
              </p>
            </div>
            
            {candidateTables.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400">No hay otras tablas disponibles</p>
                <button
                  onClick={skipSecondaryTable}
                  className="mt-3 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600"
                >
                  Continuar sin tabla secundaria
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {candidateTables.map(table => (
                    <button
                      key={table._id}
                      onClick={() => handleSelectSecondaryTable(table)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-600/50 hover:border-amber-500/50 hover:bg-slate-700/30 transition-all text-left"
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm"
                        style={{ backgroundColor: table.color || '#F59E0B' }}
                      >
                        {table.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-200 truncate">{table.name}</h4>
                        <p className="text-xs text-slate-500">
                          {table.headers?.length || 0} campos
                        </p>
                      </div>
                      <span className="text-slate-600">{Icons.arrowRight}</span>
                    </button>
                  ))}
                </div>
                {!isPOS && (
                  <button
                    onClick={skipSecondaryTable}
                    className="w-full py-2 text-center text-sm text-slate-400 hover:text-slate-200"
                  >
                    Omitir - Usar solo tabla principal
                  </button>
                )}
              </>
            )}
          </div>
        );
        
      case STEPS.SELECT_TERTIARY:
        // Para POS: seleccionar tabla de productos
        const productTables = tables.filter(t => 
          t._id !== selectedTable._id && t._id !== secondaryTable?._id
        );
        
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
              <span className="px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-400">
                {selectedType.name}
              </span>
              <span>→</span>
              <span className="px-2 py-1 rounded-md bg-slate-700/50 text-slate-300">
                {selectedTable.name}
              </span>
              <span>→</span>
              <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-400">
                {secondaryTable?.name}
              </span>
              <span>→ Tabla de productos</span>
            </div>
            
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-emerald-300 text-sm">
                Selecciona la tabla con el menú/catálogo de productos disponibles para vender.
              </p>
            </div>
            
            {productTables.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400">No hay más tablas disponibles</p>
                <button
                  onClick={skipTertiaryTable}
                  className="mt-3 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600"
                >
                  Continuar sin tabla de productos
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {productTables.map(table => (
                  <button
                    key={table._id}
                    onClick={() => handleSelectTertiaryTable(table)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-600/50 hover:border-emerald-500/50 hover:bg-slate-700/30 transition-all text-left"
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: table.color || '#10B981' }}
                    >
                      {table.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-200 truncate">{table.name}</h4>
                      <p className="text-xs text-slate-500">
                        {table.headers?.length || 0} campos
                      </p>
                    </div>
                    <span className="text-slate-600">{Icons.arrowRight}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
        
      case STEPS.ANALYZE:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-400">
                {selectedType.name}
              </span>
              <span>→</span>
              <span className="px-2 py-1 rounded-md bg-slate-700/50 text-slate-300">
                {selectedTable.name}
              </span>
            </div>
            
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                    {Icons.sparkles}
                  </div>
                </div>
                <p className="text-slate-400 text-sm">Analizando estructura de datos...</p>
              </div>
            ) : analysisResult ? (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className={`flex items-center gap-2 p-3 rounded-xl ${
                  analysisResult.status === 'complete' 
                    ? 'bg-emerald-500/10 border border-emerald-500/30' 
                    : analysisResult.status === 'incomplete'
                      ? 'bg-amber-500/10 border border-amber-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  {analysisResult.status === 'complete' ? (
                    <>
                      <span className="text-emerald-400">{Icons.check}</span>
                      <span className="text-emerald-300">
                        ¡Mapeo completo! La tabla es compatible con esta vista.
                      </span>
                    </>
                  ) : analysisResult.status === 'incomplete' ? (
                    <>
                      <span className="text-amber-400">{Icons.warning}</span>
                      <div>
                        <span className="text-amber-300 block">Mapeo parcial</span>
                        <span className="text-amber-400/70 text-sm">
                          Algunos campos requeridos no se encontraron automáticamente.
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-red-400">{Icons.error}</span>
                      <span className="text-red-300">
                        {analysisResult.message || 'La tabla no es compatible con esta vista'}
                      </span>
                    </>
                  )}
                </div>
                
                {/* Confidence */}
                {analysisResult.confidence && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">Confianza del mapeo:</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${analysisResult.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-slate-400">{Math.round(analysisResult.confidence * 100)}%</span>
                  </div>
                )}
                
                {/* Suggestions */}
                {analysisResult.suggestions?.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/50">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Sugerencias</p>
                    <ul className="space-y-1">
                      {analysisResult.suggestions.map((suggestion, i) => (
                        <li key={i} className="text-sm text-slate-400 flex gap-2">
                          <span className="text-slate-600">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {(analysisResult.status === 'complete' || analysisResult.status === 'incomplete') && (
                  <button
                    onClick={() => setStep(STEPS.CONFIGURE)}
                    className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors"
                  >
                    Continuar con configuración
                  </button>
                )}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <span className="text-red-400">{Icons.error}</span>
                <p className="text-red-400 mt-2">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    analyzeMapping();
                  }}
                  className="mt-4 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm"
                >
                  Reintentar
                </button>
              </div>
            ) : null}
          </div>
        );
        
      case STEPS.CONFIGURE:
        const tableHeaders = selectedTable?.headers || [];
        const headerOptions = tableHeaders.map(h => h.key || h.label);
        
        return (
          <div className="space-y-4">
            {/* View Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de la vista
              </label>
              <input
                type="text"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="Ej: Calendario de Citas"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none"
              />
            </div>
            
            {/* Field Mapping */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Mapeo de campos
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-xl bg-slate-700/30 border border-slate-600/50">
                {[...selectedType.requiredFields, ...selectedType.optionalFields].map(viewField => {
                  const isRequired = selectedType.requiredFields.includes(viewField);
                  const currentValue = fieldMap[viewField];
                  
                  return (
                    <div key={viewField} className="flex items-center gap-3">
                      <div className="w-28 shrink-0">
                        <span className={`text-sm ${isRequired ? 'text-slate-200' : 'text-slate-400'}`}>
                          {viewField}
                          {isRequired && <span className="text-red-400 ml-1">*</span>}
                        </span>
                      </div>
                      <span className="text-slate-600">→</span>
                      <select
                        value={currentValue || ''}
                        onChange={(e) => handleFieldMapChange(viewField, e.target.value)}
                        className={`flex-1 px-3 py-1.5 rounded-lg bg-slate-600/50 border text-sm focus:outline-none ${
                          isRequired && !currentValue
                            ? 'border-red-500/50 text-red-400'
                            : 'border-slate-500/50 text-slate-200'
                        }`}
                      >
                        <option value="">-- Seleccionar --</option>
                        {headerOptions.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Nueva Vista</h2>
            <p className="text-sm text-slate-400">
              {step === STEPS.SELECT_TYPE && 'Paso 1: Tipo de vista'}
              {step === STEPS.SELECT_TABLE && 'Paso 2: Seleccionar tabla principal'}
              {step === STEPS.SELECT_SECONDARY && (selectedType?.type === 'pos' ? 'Paso 3: Tabla de pedidos' : 'Paso 3: Tabla de reservas (opcional)')}
              {step === STEPS.SELECT_TERTIARY && 'Paso 4: Tabla de productos'}
              {step === STEPS.ANALYZE && (selectedType?.type === 'pos' ? 'Paso 5: Análisis' : selectedType?.type === 'floorplan' ? 'Paso 4: Análisis' : 'Paso 3: Análisis')}
              {step === STEPS.CONFIGURE && (selectedType?.type === 'pos' ? 'Paso 6: Configuración' : selectedType?.type === 'floorplan' ? 'Paso 5: Configuración' : 'Paso 4: Configuración')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {Icons.close}
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {renderStepContent()}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
          <div>
            {step > STEPS.SELECT_TYPE && (
              <button
                onClick={() => {
                  // Lógica de navegación hacia atrás
                  if (step === STEPS.CONFIGURE) {
                    setStep(STEPS.ANALYZE);
                  } else if (step === STEPS.ANALYZE) {
                    // Según el tipo, volver al paso anterior correcto
                    if (selectedType?.type === 'pos') {
                      setStep(STEPS.SELECT_TERTIARY);
                    } else if (selectedType?.type === 'floorplan') {
                      setStep(STEPS.SELECT_SECONDARY);
                    } else {
                      setStep(STEPS.SELECT_TABLE);
                    }
                  } else if (step === STEPS.SELECT_TERTIARY) {
                    setStep(STEPS.SELECT_SECONDARY);
                  } else if (step === STEPS.SELECT_SECONDARY) {
                    setStep(STEPS.SELECT_TABLE);
                  } else {
                    setStep(step - 1);
                  }
                  setError(null);
                }}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 text-sm transition-colors"
              >
                ← Atrás
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Progress dots - dinámico según tipo de vista */}
            <div className="flex gap-1 mr-4">
              {(selectedType?.type === 'pos' 
                ? [0, 1, 2, 3, 4, 5] 
                : selectedType?.type === 'floorplan' 
                  ? [0, 1, 2, 4, 5] 
                  : [0, 1, 4, 5]
              ).map((s, idx) => (
                <div 
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s === step ? 'bg-indigo-500' : s < step ? 'bg-indigo-500/50' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
            
            {step === STEPS.CONFIGURE && (
              <button
                onClick={handleCreate}
                disabled={!canProceedToCreate() || creating}
                className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Creando...
                  </span>
                ) : (
                  'Crear Vista'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
