import { useState, useMemo } from 'react';
import { analyzeViewMapping, validateViewConfig } from '../../api/client';

const Icons = {
  back: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  check: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
  warning: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  sparkles: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
  arrowRight: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>,
  plus: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  x: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  link: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>,
  calendar: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  kanban: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>,
  timeline: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>,
  cards: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.5l9 5.25 9-5.25M2.25 7.5l9-5.25 9 5.25M2.25 7.5v9l9 5.25M21.75 7.5v9l-9 5.25M12 12.75l9-5.25M12 12.75l-9-5.25M12 12.75V21" /></svg>,
  table: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625" /></svg>,
  floorplan: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>,
  pos: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
};

const VIEW_ICONS = {
  calendar: Icons.calendar,
  kanban: Icons.kanban,
  timeline: Icons.timeline,
  cards: Icons.cards,
  table: Icons.table,
  floorplan: Icons.floorplan,
  pos: Icons.pos,
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

// Estados del flujo
const STEPS = {
  SELECT_OPTIONS: 0,      // Seleccionar tabla + tipo de vista + relaciones
  ANALYZING: 1,           // LLM analizando compatibilidad
  COMPATIBILITY_RESULT: 2, // Resultado: compatible, necesita campos, o incompatible
  CONFIGURE_MAPPING: 3,   // Configurar mapeo de campos
  VALIDATING: 4,          // Validando configuración final
  READY_TO_CREATE: 5,     // Listo para crear
  CREATING: 6,            // Creando vista
};

// Niveles de compatibilidad
const COMPATIBILITY = {
  FULL: 'full',
  PARTIAL: 'partial',
  INCOMPATIBLE: 'incompatible',
};

export default function ViewCreatorInline({ 
  workspaceId, 
  tables, 
  viewTypes, 
  onCancel, 
  onCreate 
}) {
  const [step, setStep] = useState(STEPS.SELECT_OPTIONS);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedViewType, setSelectedViewType] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [fieldMap, setFieldMap] = useState({});
  const [viewName, setViewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  
  // Tablas relacionadas
  const [relatedTables, setRelatedTables] = useState([]);
  // { tableId, table, localField, foreignField, alias }
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [newRelation, setNewRelation] = useState({
    tableId: '',
    localField: '',
    foreignField: '',
    alias: '',
  });

  // Obtener todos los campos disponibles (tabla principal + relacionadas)
  const allAvailableFields = useMemo(() => {
    const fields = [];
    
    // Campos de la tabla principal
    if (selectedTable) {
      (selectedTable.headers || []).forEach(h => {
        fields.push({
          key: h.key || h.label,
          label: h.label || h.key,
          table: selectedTable.name,
          tableId: selectedTable._id,
          isMain: true,
          fullKey: h.key || h.label,
        });
      });
    }
    
    // Campos de tablas relacionadas
    relatedTables.forEach(rel => {
      (rel.table.headers || []).forEach(h => {
        const alias = rel.alias || rel.table.name;
        fields.push({
          key: h.key || h.label,
          label: `${alias}.${h.label || h.key}`,
          table: rel.table.name,
          tableId: rel.table._id,
          isMain: false,
          alias,
          fullKey: `${alias}.${h.key || h.label}`,
        });
      });
    });
    
    return fields;
  }, [selectedTable, relatedTables]);

  // Tablas disponibles para relacionar (excepto la principal y las ya relacionadas)
  const availableTablesForRelation = useMemo(() => {
    if (!selectedTable) return [];
    const usedIds = [selectedTable._id, ...relatedTables.map(r => r.tableId)];
    return tables.filter(t => !usedIds.includes(t._id));
  }, [tables, selectedTable, relatedTables]);

  // Agregar relación
  const handleAddRelation = () => {
    if (!newRelation.tableId || !newRelation.localField || !newRelation.foreignField) {
      return;
    }

    const relatedTable = tables.find(t => t._id === newRelation.tableId);
    if (!relatedTable) return;

    setRelatedTables(prev => [...prev, {
      tableId: newRelation.tableId,
      table: relatedTable,
      localField: newRelation.localField,
      foreignField: newRelation.foreignField,
      alias: newRelation.alias || relatedTable.name,
    }]);

    setNewRelation({ tableId: '', localField: '', foreignField: '', alias: '' });
    setShowAddRelation(false);
  };

  // Eliminar relación
  const handleRemoveRelation = (tableId) => {
    setRelatedTables(prev => prev.filter(r => r.tableId !== tableId));
  };

  // Añadir relación sugerida (desde las sugerencias del análisis)
  const handleAddSuggestedRelation = async (suggestion) => {
    const relatedTable = tables.find(t => t._id === suggestion.tableId);
    if (!relatedTable) return;

    // Añadir la relación
    setRelatedTables(prev => [...prev, {
      tableId: suggestion.tableId,
      table: relatedTable,
      localField: suggestion.localField,
      foreignField: suggestion.foreignField,
      alias: relatedTable.name,
    }]);

    // Re-analizar con la nueva relación
    setStep(STEPS.ANALYZING);
    setError(null);

    try {
      const newRelatedTables = [...relatedTables, {
        tableId: suggestion.tableId,
        localField: suggestion.localField,
        foreignField: suggestion.foreignField,
        alias: relatedTable.name,
      }];

      const response = await analyzeViewMapping({
        workspaceId,
        tableId: selectedTable._id,
        viewType: selectedViewType.type,
        relatedTables: newRelatedTables.map(r => ({
          tableId: r.tableId,
          localField: r.localField,
          foreignField: r.foreignField,
          alias: r.alias,
        })),
      });

      setAnalysisResult(response.data);
      if (response.data.fieldMap) {
        setFieldMap(response.data.fieldMap);
      }
      setStep(STEPS.COMPATIBILITY_RESULT);

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al re-analizar');
      setStep(STEPS.COMPATIBILITY_RESULT);
    }
  };

  // Analizar compatibilidad
  const handleAnalyze = async () => {
    if (!selectedTable || !selectedViewType) {
      setError('Selecciona una tabla y un tipo de vista');
      return;
    }

    setStep(STEPS.ANALYZING);
    setError(null);

    try {
      // Incluir campos de todas las tablas
      const allFields = allAvailableFields.map(f => f.fullKey);
      
      const response = await analyzeViewMapping({
        workspaceId,
        tableId: selectedTable._id,
        viewType: selectedViewType.type,
        selectedFields: allFields,
        relatedTables: relatedTables.map(r => ({
          tableId: r.tableId,
          localField: r.localField,
          foreignField: r.foreignField,
          alias: r.alias,
        })),
      });

      setAnalysisResult(response.data);

      if (response.data.fieldMap) {
        setFieldMap(response.data.fieldMap);
      }

      if (response.data.suggestedName) {
        setViewName(response.data.suggestedName);
      } else {
        setViewName(`${selectedViewType.name} de ${selectedTable.name}`);
      }

      setStep(STEPS.COMPATIBILITY_RESULT);

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al analizar compatibilidad');
      setStep(STEPS.SELECT_OPTIONS);
    }
  };

  // Cambiar tipo de vista
  const handleChangeViewType = (type) => {
    const viewType = viewTypes.find(vt => vt.type === type);
    if (viewType) {
      setSelectedViewType(viewType);
      setAnalysisResult(null);
      setFieldMap({});
      setValidationResult(null);
      setStep(STEPS.SELECT_OPTIONS);
    }
  };

  // Continuar a configurar mapeo
  const handleContinueToMapping = () => {
    setStep(STEPS.CONFIGURE_MAPPING);
  };

  // Manejar cambio en mapeo
  const handleFieldMapChange = (viewField, tableField) => {
    setFieldMap(prev => ({
      ...prev,
      [viewField]: tableField || null,
    }));
    setValidationResult(null);
  };

  // Validar configuración
  const handleValidate = async () => {
    if (!viewName.trim()) {
      setError('Ingresa un nombre para la vista');
      return;
    }

    setStep(STEPS.VALIDATING);
    setError(null);

    try {
      const allFields = allAvailableFields.map(f => f.fullKey);
      
      const response = await validateViewConfig({
        workspaceId,
        tableId: selectedTable._id,
        viewType: selectedViewType.type,
        fieldMap,
        availableFields: allFields,
        viewName: viewName.trim(),
        relatedTables: relatedTables.map(r => ({
          tableId: r.tableId,
          localField: r.localField,
          foreignField: r.foreignField,
          alias: r.alias,
        })),
      });

      setValidationResult(response.data);
      setStep(STEPS.READY_TO_CREATE);

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al validar');
      setStep(STEPS.CONFIGURE_MAPPING);
    }
  };

  const handleBackToConfig = () => {
    setStep(STEPS.CONFIGURE_MAPPING);
    setValidationResult(null);
  };

  // Crear la vista
  const handleCreate = async () => {
    setCreating(true);
    setStep(STEPS.CREATING);
    setError(null);

    try {
      const viewData = {
        name: viewName.trim(),
        type: selectedViewType.type,
        tableId: selectedTable._id,
        fieldMap,
        color: VIEW_COLORS[selectedViewType.type] || '#4F46E5',
        icon: selectedViewType.icon,
        mappingMetadata: analysisResult?.mappingMetadata,
        validationMetadata: validationResult?.metadata,
        // Guardar las relaciones
        relatedTables: relatedTables.map(r => ({
          tableId: r.tableId,
          localField: r.localField,
          foreignField: r.foreignField,
          alias: r.alias,
        })),
      };

      await onCreate(viewData);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la vista');
      setCreating(false);
      setStep(STEPS.READY_TO_CREATE);
    }
  };

  const canAnalyze = selectedTable && selectedViewType;

  const canValidate = () => {
    if (!selectedViewType || !viewName.trim()) return false;
    const requiredFields = selectedViewType.requiredFields || [];
    return requiredFields.every(field => fieldMap[field]);
  };

  const getCompatibility = () => {
    if (!analysisResult) return null;
    if (analysisResult.compatibility) return analysisResult.compatibility;
    if (analysisResult.status === 'complete') return COMPATIBILITY.FULL;
    if (analysisResult.status === 'incomplete') {
      const missingRequired = analysisResult.missingFields?.filter(f => f.required) || [];
      return missingRequired.length > 0 ? COMPATIBILITY.PARTIAL : COMPATIBILITY.FULL;
    }
    if (analysisResult.status === 'incompatible') return COMPATIBILITY.INCOMPATIBLE;
    return COMPATIBILITY.PARTIAL;
  };

  // Renderizar contenido según el paso
  const renderContent = () => {
    switch (step) {
      case STEPS.SELECT_OPTIONS:
        return (
          <div className="space-y-6">
            {/* Selección de Tabla Principal */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                1. Selecciona la tabla principal
              </label>
              {tables.length === 0 ? (
                <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <p className="text-slate-400">No hay tablas en este workspace</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tables.map(table => (
                    <button
                      key={table._id}
                      onClick={() => {
                        setSelectedTable(table);
                        setRelatedTables([]);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                        selectedTable?._id === table._id
                          ? 'border-indigo-500 bg-indigo-500/20'
                          : 'border-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: table.color || '#4F46E5' }}
                      >
                        {table.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${
                          selectedTable?._id === table._id ? 'text-indigo-300' : 'text-slate-200'
                        }`}>
                          {table.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {table.headers?.length || 0} campos
                        </p>
                      </div>
                      {selectedTable?._id === table._id && (
                        <span className="text-indigo-400">{Icons.check}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tablas Relacionadas (opcional) */}
            {selectedTable && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-300">
                    2. Relacionar con otras tablas 
                    <span className="text-slate-500 font-normal ml-1">(opcional)</span>
                  </label>
                  {availableTablesForRelation.length > 0 && !showAddRelation && (
                    <button
                      onClick={() => setShowAddRelation(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    >
                      {Icons.link}
                      Añadir relación
                    </button>
                  )}
                </div>

                {/* Relaciones existentes */}
                {relatedTables.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {relatedTables.map(rel => (
                      <div 
                        key={rel.tableId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: rel.table.color || '#10B981' }}
                        >
                          {rel.table.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-emerald-300">{rel.alias || rel.table.name}</span>
                            {rel.alias && rel.alias !== rel.table.name && (
                              <span className="text-xs text-slate-500">({rel.table.name})</span>
                            )}
                          </div>
                          <p className="text-xs text-emerald-400/70">
                            {selectedTable.name}.{rel.localField} → {rel.table.name}.{rel.foreignField}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveRelation(rel.tableId)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          {Icons.x}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario para agregar relación */}
                {showAddRelation && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-200">Añadir tabla relacionada</h4>
                      <button
                        onClick={() => {
                          setShowAddRelation(false);
                          setNewRelation({ tableId: '', localField: '', foreignField: '', alias: '' });
                        }}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        {Icons.x}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Seleccionar tabla a relacionar */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Tabla a relacionar</label>
                        <select
                          value={newRelation.tableId}
                          onChange={(e) => setNewRelation(prev => ({ ...prev, tableId: e.target.value, foreignField: '' }))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50"
                        >
                          <option value="">Seleccionar tabla...</option>
                          {availableTablesForRelation.map(t => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Alias (opcional) */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Alias <span className="text-slate-500">(ej: "Cliente", "Vendedor")</span>
                        </label>
                        <input
                          type="text"
                          value={newRelation.alias}
                          onChange={(e) => setNewRelation(prev => ({ ...prev, alias: e.target.value }))}
                          placeholder="Nombre para mostrar"
                          className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>

                      {/* Campo local (de la tabla principal) */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Campo en "{selectedTable.name}" que referencia
                        </label>
                        <select
                          value={newRelation.localField}
                          onChange={(e) => setNewRelation(prev => ({ ...prev, localField: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50"
                        >
                          <option value="">Seleccionar campo...</option>
                          {(selectedTable.headers || []).map(h => (
                            <option key={h.key || h.label} value={h.key || h.label}>
                              {h.label || h.key}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Campo foráneo (de la tabla relacionada) */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Campo en tabla relacionada para unir
                        </label>
                        <select
                          value={newRelation.foreignField}
                          onChange={(e) => setNewRelation(prev => ({ ...prev, foreignField: e.target.value }))}
                          disabled={!newRelation.tableId}
                          className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
                        >
                          <option value="">Seleccionar campo...</option>
                          {newRelation.tableId && (tables.find(t => t._id === newRelation.tableId)?.headers || []).map(h => (
                            <option key={h.key || h.label} value={h.key || h.label}>
                              {h.label || h.key}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ejemplo visual de la relación */}
                    {newRelation.tableId && newRelation.localField && newRelation.foreignField && (
                      <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <p className="text-sm text-indigo-300">
                          <span className="font-medium">{selectedTable.name}</span>
                          <span className="text-indigo-400">.{newRelation.localField}</span>
                          <span className="text-slate-500 mx-2">→</span>
                          <span className="font-medium">{tables.find(t => t._id === newRelation.tableId)?.name}</span>
                          <span className="text-indigo-400">.{newRelation.foreignField}</span>
                        </p>
                        <p className="text-xs text-indigo-400/70 mt-1">
                          Los registros se unirán cuando estos campos coincidan
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={handleAddRelation}
                        disabled={!newRelation.tableId || !newRelation.localField || !newRelation.foreignField}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                      >
                        {Icons.plus}
                        Agregar Relación
                      </button>
                    </div>
                  </div>
                )}

                {/* Mensaje informativo si no hay relaciones */}
                {relatedTables.length === 0 && !showAddRelation && (
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <p className="text-sm text-slate-400">
                      Puedes relacionar otras tablas para mostrar más información.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ejemplo: En Tareas, añadir datos del Cliente o del Vendedor asignado.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Selección de Tipo de Vista */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                {selectedTable ? '3.' : '2.'} Selecciona el tipo de vista
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {viewTypes.map(vt => (
                  <button
                    key={vt.type}
                    onClick={() => setSelectedViewType(vt)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      selectedViewType?.type === vt.type
                        ? 'border-indigo-500 bg-indigo-500/20'
                        : 'border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: VIEW_COLORS[vt.type] || '#4F46E5' }}
                    >
                      {VIEW_ICONS[vt.type] || Icons.table}
                    </div>
                    <span className={`text-sm font-medium ${
                      selectedViewType?.type === vt.type ? 'text-indigo-300' : 'text-slate-300'
                    }`}>
                      {vt.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vista previa de campos disponibles */}
            {selectedTable && (
              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Campos disponibles ({allAvailableFields.length})
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {allAvailableFields.map((f, i) => (
                    <span 
                      key={i}
                      className={`px-2 py-1 text-xs rounded-md ${
                        f.isMain 
                          ? 'bg-slate-700/50 text-slate-300' 
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Botón analizar */}
            <div className="flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                {Icons.sparkles}
                Analizar Compatibilidad
              </button>
            </div>
          </div>
        );

      case STEPS.ANALYZING:
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                {Icons.sparkles}
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-medium">
                Analizando compatibilidad...
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Verificando campos de {1 + relatedTables.length} tabla{relatedTables.length > 0 ? 's' : ''} para "{selectedViewType?.name}"
              </p>
            </div>
          </div>
        );

      case STEPS.COMPATIBILITY_RESULT:
        const compatibility = getCompatibility();
        const suggestedViews = analysisResult?.suggestedAlternatives || [];
        const missingFields = analysisResult?.missingFields || [];
        const requiredMissing = missingFields.filter(f => f.required);
        const optionalMissing = missingFields.filter(f => !f.required);

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setAnalysisResult(null);
                  setStep(STEPS.SELECT_OPTIONS);
                }}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
              >
                {Icons.back}
              </button>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Resultado del Análisis</h3>
                <p className="text-sm text-slate-400">
                  {selectedViewType?.name} • {selectedTable?.name}
                  {relatedTables.length > 0 && ` + ${relatedTables.length} relacionada${relatedTables.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            {/* Estado de compatibilidad */}
            <div className={`flex items-start gap-4 p-5 rounded-xl ${
              compatibility === COMPATIBILITY.FULL 
                ? 'bg-emerald-500/10 border border-emerald-500/30' 
                : compatibility === COMPATIBILITY.PARTIAL
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                compatibility === COMPATIBILITY.FULL 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : compatibility === COMPATIBILITY.PARTIAL
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
              }`}>
                {compatibility === COMPATIBILITY.FULL ? Icons.check : Icons.warning}
              </div>
              <div className="flex-1">
                {compatibility === COMPATIBILITY.FULL ? (
                  <>
                    <h4 className="text-emerald-300 font-semibold text-lg">¡Totalmente Compatible!</h4>
                    <p className="text-emerald-400/80 mt-1">
                      Tienes todos los campos necesarios para crear la vista.
                    </p>
                  </>
                ) : compatibility === COMPATIBILITY.PARTIAL ? (
                  <>
                    <h4 className="text-amber-300 font-semibold text-lg">Parcialmente Compatible</h4>
                    <p className="text-amber-400/80 mt-1">
                      Puedes crear la vista, pero faltan algunos campos.
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-red-300 font-semibold text-lg">No Compatible</h4>
                    <p className="text-red-400/80 mt-1">
                      Faltan campos requeridos. Considera añadir otra tabla relacionada o cambiar el tipo de vista.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Tablas utilizadas */}
            {relatedTables.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Tablas en esta vista</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 text-sm rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {selectedTable?.name} (principal)
                  </span>
                  {relatedTables.map(rel => (
                    <span key={rel.tableId} className="px-3 py-1.5 text-sm rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {rel.alias || rel.table.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Campos faltantes */}
            {missingFields.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-sm font-medium text-slate-300 mb-3">Campos que faltan</p>
                {requiredMissing.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-red-400 mb-2">Requeridos:</p>
                    <div className="space-y-2">
                      {requiredMissing.map((field, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <span className="text-red-400 font-medium">{field.name}</span>
                          {field.description && (
                            <span className="text-xs text-red-400/60">- {field.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {optionalMissing.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Opcionales:</p>
                    <div className="flex flex-wrap gap-2">
                      {optionalMissing.map((field, i) => (
                        <span key={i} className="px-2 py-1 text-xs rounded-md bg-slate-700/50 text-slate-400">
                          {field.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vistas alternativas */}
            {compatibility === COMPATIBILITY.INCOMPATIBLE && suggestedViews.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Tipos de vista recomendados:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedViews.map((suggestedType, i) => {
                    const vt = viewTypes.find(v => v.type === suggestedType);
                    if (!vt) return null;
                    return (
                      <button
                        key={i}
                        onClick={() => handleChangeViewType(suggestedType)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: VIEW_COLORS[suggestedType] }}
                        >
                          {VIEW_ICONS[suggestedType]}
                        </div>
                        <span className="text-emerald-300 font-medium">{vt.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mapeo sugerido */}
            {(compatibility === COMPATIBILITY.FULL || compatibility === COMPATIBILITY.PARTIAL) && analysisResult?.fieldMap && (
              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Mapeo sugerido</p>
                <div className="space-y-2">
                  {Object.entries(analysisResult.fieldMap).map(([viewField, tableField]) => (
                    <div key={viewField} className="flex items-center gap-3 text-sm">
                      <span className="w-28 text-slate-400">{viewField}</span>
                      <span className="text-slate-600">→</span>
                      <span className={tableField ? 'text-emerald-400' : 'text-red-400'}>
                        {tableField || '(sin mapear)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sugerencias de tablas para relacionar */}
            {analysisResult?.suggestedRelations?.length > 0 && (
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  {Icons.link}
                  <p className="text-sm font-medium text-cyan-300">
                    Tablas sugeridas para relacionar
                  </p>
                </div>
                <p className="text-xs text-cyan-400/70 mb-3">
                  Detectamos campos que podrían enriquecer tu vista con información de otras tablas
                </p>
                <div className="space-y-2">
                  {analysisResult.suggestedRelations.map((suggestion, i) => {
                    // Verificar si ya está relacionada
                    const alreadyAdded = relatedTables.some(r => r.tableId === suggestion.tableId);
                    
                    return (
                      <div 
                        key={i}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg ${
                          alreadyAdded 
                            ? 'bg-emerald-500/20 border border-emerald-500/30'
                            : 'bg-slate-800/50 border border-slate-700/50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${alreadyAdded ? 'text-emerald-300' : 'text-cyan-300'}`}>
                              {suggestion.tableName}
                            </span>
                            {alreadyAdded && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/30 text-emerald-300">
                                Añadida
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {suggestion.reason}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {selectedTable?.name}.{suggestion.localField} → {suggestion.tableName}.{suggestion.foreignField}
                          </p>
                        </div>
                        {!alreadyAdded && (
                          <button
                            onClick={() => handleAddSuggestedRelation(suggestion)}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium transition-colors"
                          >
                            {Icons.plus}
                            Añadir
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  setAnalysisResult(null);
                  setStep(STEPS.SELECT_OPTIONS);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 hover:bg-slate-700/50 text-slate-300 transition-colors"
              >
                {Icons.back}
                Cambiar selección
              </button>
              
              {(compatibility === COMPATIBILITY.FULL || compatibility === COMPATIBILITY.PARTIAL) && (
                <button
                  onClick={handleContinueToMapping}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors"
                >
                  Continuar a Configurar
                  {Icons.arrowRight}
                </button>
              )}
            </div>
          </div>
        );

      case STEPS.CONFIGURE_MAPPING:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(STEPS.COMPATIBILITY_RESULT)}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
              >
                {Icons.back}
              </button>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Configurar Vista</h3>
                <p className="text-sm text-slate-400">
                  {selectedViewType?.name} • {allAvailableFields.length} campos disponibles
                </p>
              </div>
            </div>

            {/* Nombre */}
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

            {/* Mapeo de campos */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Mapeo de campos
              </label>
              <div className="space-y-2 max-h-80 overflow-y-auto p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                {[...(selectedViewType?.requiredFields || []), ...(selectedViewType?.optionalFields || [])].map(viewField => {
                  const isRequired = (selectedViewType?.requiredFields || []).includes(viewField);
                  const currentValue = fieldMap[viewField];
                  
                  return (
                    <div key={viewField} className="flex items-center gap-3">
                      <div className="w-32 shrink-0">
                        <span className={`text-sm ${isRequired ? 'text-slate-200' : 'text-slate-400'}`}>
                          {viewField}
                          {isRequired && <span className="text-red-400 ml-1">*</span>}
                        </span>
                      </div>
                      <span className="text-slate-600">→</span>
                      <select
                        value={currentValue || ''}
                        onChange={(e) => handleFieldMapChange(viewField, e.target.value)}
                        className={`flex-1 px-3 py-2 rounded-lg bg-slate-600/50 border text-sm focus:outline-none ${
                          isRequired && !currentValue
                            ? 'border-red-500/50 text-red-400'
                            : currentValue 
                              ? 'border-emerald-500/50 text-slate-200'
                              : 'border-slate-500/50 text-slate-200'
                        }`}
                      >
                        <option value="">-- Seleccionar --</option>
                        {/* Campos de tabla principal */}
                        <optgroup label={`📋 ${selectedTable?.name}`}>
                          {allAvailableFields.filter(f => f.isMain).map(f => (
                            <option key={f.fullKey} value={f.fullKey}>{f.key}</option>
                          ))}
                        </optgroup>
                        {/* Campos de tablas relacionadas */}
                        {relatedTables.map(rel => (
                          <optgroup key={rel.tableId} label={`🔗 ${rel.alias || rel.table.name}`}>
                            {allAvailableFields.filter(f => f.tableId === rel.tableId).map(f => (
                              <option key={f.fullKey} value={f.fullKey}>{f.key}</option>
                            ))}
                          </optgroup>
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

            <div className="flex justify-end pt-2">
              <button
                onClick={handleValidate}
                disabled={!canValidate()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                {Icons.sparkles}
                Validar Configuración
              </button>
            </div>
          </div>
        );

      case STEPS.VALIDATING:
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                {Icons.sparkles}
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-medium">Validando configuración...</p>
            </div>
          </div>
        );

      case STEPS.READY_TO_CREATE:
        const isValid = validationResult?.isValid;
        const hasWarnings = validationResult?.warnings?.length > 0;
        const hasErrors = validationResult?.errors?.length > 0;
        
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToConfig}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
              >
                {Icons.back}
              </button>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Resultado de Validación</h3>
              </div>
            </div>

            {/* Estado */}
            <div className={`flex items-center gap-3 p-4 rounded-xl ${
              isValid && !hasWarnings
                ? 'bg-emerald-500/10 border border-emerald-500/30' 
                : isValid && hasWarnings
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {isValid && !hasWarnings ? (
                <>
                  <span className="text-emerald-400">{Icons.check}</span>
                  <span className="text-emerald-300 font-medium">¡Configuración válida!</span>
                </>
              ) : isValid && hasWarnings ? (
                <>
                  <span className="text-amber-400">{Icons.warning}</span>
                  <span className="text-amber-300 font-medium">Válida con advertencias</span>
                </>
              ) : (
                <>
                  <span className="text-red-400">{Icons.warning}</span>
                  <span className="text-red-300 font-medium">Configuración inválida</span>
                </>
              )}
            </div>

            {/* Resumen */}
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Resumen</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vista:</span>
                  <span className="text-slate-200 font-medium">{viewName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tipo:</span>
                  <span className="text-slate-200 font-medium">{selectedViewType?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tabla principal:</span>
                  <span className="text-slate-200 font-medium">{selectedTable?.name}</span>
                </div>
                {relatedTables.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tablas relacionadas:</span>
                    <span className="text-emerald-300 font-medium">
                      {relatedTables.map(r => r.alias || r.table.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Errores */}
            {hasErrors && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-xs text-red-500 uppercase tracking-wider mb-2">Errores</p>
                <ul className="space-y-1">
                  {validationResult.errors.map((err, i) => (
                    <li key={i} className="text-sm text-red-300 flex gap-2">
                      <span className="text-red-500">✗</span>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advertencias */}
            {hasWarnings && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs text-amber-500 uppercase tracking-wider mb-2">Advertencias</p>
                <ul className="space-y-1">
                  {validationResult.warnings.map((warn, i) => (
                    <li key={i} className="text-sm text-amber-300 flex gap-2">
                      <span className="text-amber-500">⚠</span>
                      {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-between pt-2">
              <button
                onClick={handleBackToConfig}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 hover:bg-slate-700/50 text-slate-300 transition-colors"
              >
                {Icons.back}
                Volver a Ajustar
              </button>
              
              <button
                onClick={handleCreate}
                disabled={!isValid || creating}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    {Icons.check}
                    Crear Vista
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case STEPS.CREATING:
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
              <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
                {Icons.check}
              </div>
            </div>
            <p className="text-slate-200 font-medium">Creando vista...</p>
          </div>
        );

      default:
        return null;
    }
  };

  const getCurrentProgressStep = () => {
    if (step <= STEPS.SELECT_OPTIONS) return 0;
    if (step <= STEPS.COMPATIBILITY_RESULT) return 1;
    if (step <= STEPS.CONFIGURE_MAPPING) return 2;
    return 3;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            {Icons.sparkles}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Crear Nueva Vista</h1>
            <p className="text-sm text-slate-400">
              {step === STEPS.SELECT_OPTIONS && 'Selecciona tablas y tipo de vista'}
              {step === STEPS.ANALYZING && 'Analizando...'}
              {step === STEPS.COMPATIBILITY_RESULT && 'Resultado del análisis'}
              {step === STEPS.CONFIGURE_MAPPING && 'Configura el mapeo'}
              {step === STEPS.VALIDATING && 'Validando...'}
              {step === STEPS.READY_TO_CREATE && 'Listo para crear'}
              {step === STEPS.CREATING && 'Creando...'}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* Progress */}
      <div className="px-6 py-3 bg-slate-800/30 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          {[
            { label: 'Seleccionar', step: 0 },
            { label: 'Analizar', step: 1 },
            { label: 'Configurar', step: 2 },
            { label: 'Crear', step: 3 },
          ].map((s, idx) => {
            const currentProgress = getCurrentProgressStep();
            const isActive = currentProgress === s.step;
            const isPast = currentProgress > s.step;

            return (
              <div key={s.step} className="flex items-center">
                {idx > 0 && (
                  <div className={`w-8 h-0.5 mx-1 ${isPast || isActive ? 'bg-indigo-500' : 'bg-slate-600'}`} />
                )}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-500 text-white' 
                    : isPast 
                      ? 'bg-indigo-500/20 text-indigo-400' 
                      : 'bg-slate-700/50 text-slate-500'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isPast ? 'bg-indigo-500 text-white' : ''
                  }`}>
                    {isPast ? '✓' : idx + 1}
                  </span>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {renderContent()}
      </div>
    </div>
  );
}
