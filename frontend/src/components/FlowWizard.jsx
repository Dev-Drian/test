/**
 * FlowWizard - Asistente guiado para crear flujos
 * Simplifica la creación de flujos con preguntas simples
 */
import { useState, useEffect } from 'react';
import { api } from '../api/client';

// Pasos del wizard
const STEPS = [
  { id: 0, title: '¿Qué quieres lograr?', desc: 'Objetivo del flujo' },
  { id: 1, title: '¿Cuándo se activa?', desc: 'Trigger del flujo' },
  { id: 2, title: '¿Qué datos necesitas?', desc: 'Información a recopilar' },
  { id: 3, title: '¿Qué acción realizar?', desc: 'Resultado final' },
  { id: 4, title: '¡Listo!', desc: 'Revisar y crear' },
];

// Objetivos predefinidos
const GOALS = [
  { 
    id: 'reservation', 
    icon: '📅', 
    label: 'Gestionar reservas/citas',
    description: 'Permite a los usuarios reservar, consultar o cancelar citas',
    suggestedTrigger: 'keywords',
    suggestedKeywords: ['reservar', 'cita', 'agendar', 'reserva'],
    suggestedFields: ['nombre', 'telefono', 'fecha', 'hora'],
    suggestedAction: 'create',
  },
  { 
    id: 'faq', 
    icon: '❓', 
    label: 'Responder preguntas',
    description: 'Responde automáticamente a preguntas frecuentes',
    suggestedTrigger: 'keywords',
    suggestedKeywords: ['horario', 'precio', 'información', 'ayuda'],
    suggestedFields: [],
    suggestedAction: 'respond',
  },
  { 
    id: 'registration', 
    icon: '👤', 
    label: 'Registrar clientes',
    description: 'Captura datos de nuevos clientes o usuarios',
    suggestedTrigger: 'keywords',
    suggestedKeywords: ['registrar', 'registro', 'nuevo'],
    suggestedFields: ['nombre', 'email', 'telefono'],
    suggestedAction: 'create',
  },
  { 
    id: 'order', 
    icon: '🛒', 
    label: 'Tomar pedidos',
    description: 'Recibe y procesa pedidos de productos o servicios',
    suggestedTrigger: 'keywords',
    suggestedKeywords: ['pedir', 'ordenar', 'comprar', 'pedido'],
    suggestedFields: ['nombre', 'producto', 'cantidad', 'direccion'],
    suggestedAction: 'create',
  },
  { 
    id: 'notification', 
    icon: '🔔', 
    label: 'Enviar notificaciones',
    description: 'Notifica automáticamente cuando ocurre algo',
    suggestedTrigger: 'database',
    suggestedKeywords: [],
    suggestedFields: [],
    suggestedAction: 'notify',
  },
  { 
    id: 'custom', 
    icon: '✨', 
    label: 'Personalizado',
    description: 'Crea un flujo desde cero con tu propia lógica',
    suggestedTrigger: 'keywords',
    suggestedKeywords: [],
    suggestedFields: [],
    suggestedAction: 'respond',
  },
];

// Triggers disponibles
const TRIGGERS = [
  { id: 'keywords', icon: '💬', label: 'Cuando alguien escribe...', description: 'Se activa con palabras clave específicas' },
  { id: 'database', icon: '📊', label: 'Cuando se crea un registro', description: 'Se activa al crear datos en una tabla' },
  { id: 'update', icon: '✏️', label: 'Cuando se modifica un registro', description: 'Se activa al actualizar datos' },
  { id: 'schedule', icon: '⏰', label: 'En un horario específico', description: 'Se activa a cierta hora/día' },
];

// Campos comunes
const COMMON_FIELDS = [
  { key: 'nombre', label: 'Nombre', type: 'text', icon: '👤' },
  { key: 'email', label: 'Email', type: 'email', icon: '📧' },
  { key: 'telefono', label: 'Teléfono', type: 'phone', icon: '📱' },
  { key: 'fecha', label: 'Fecha', type: 'date', icon: '📅' },
  { key: 'hora', label: 'Hora', type: 'time', icon: '🕐' },
  { key: 'direccion', label: 'Dirección', type: 'text', icon: '📍' },
  { key: 'mensaje', label: 'Mensaje', type: 'text', icon: '💬' },
  { key: 'producto', label: 'Producto', type: 'text', icon: '📦' },
  { key: 'cantidad', label: 'Cantidad', type: 'number', icon: '🔢' },
  { key: 'notas', label: 'Notas', type: 'text', icon: '📝' },
];

// Acciones disponibles
const ACTIONS = [
  { id: 'create', icon: '➕', label: 'Crear registro', description: 'Guarda los datos en una tabla' },
  { id: 'update', icon: '✏️', label: 'Actualizar registro', description: 'Modifica un registro existente' },
  { id: 'respond', icon: '💬', label: 'Solo responder', description: 'Envía un mensaje sin guardar datos' },
  { id: 'notify', icon: '🔔', label: 'Notificar', description: 'Envía una notificación al equipo' },
];

export default function FlowWizard({ workspaceId, onCreate, onClose }) {
  const [step, setStep] = useState(0);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Configuración del flujo
  const [config, setConfig] = useState({
    goal: null,
    name: '',
    trigger: null,
    keywords: [],
    keywordInput: '',
    selectedTable: null,
    fields: [],
    action: null,
    responseMessage: '',
  });

  // Cargar tablas
  useEffect(() => {
    if (workspaceId) {
      loadTables();
    }
  }, [workspaceId]);

  const loadTables = async () => {
    try {
      const res = await api.get('/table/list', { params: { workspaceId } });
      setTables(res.data || []);
    } catch (err) {
      console.error('Error loading tables:', err);
    }
  };

  // Seleccionar objetivo
  const handleSelectGoal = (goal) => {
    setConfig(prev => ({
      ...prev,
      goal,
      name: goal.label,
      trigger: TRIGGERS.find(t => t.id === goal.suggestedTrigger),
      keywords: goal.suggestedKeywords,
      fields: COMMON_FIELDS.filter(f => goal.suggestedFields.includes(f.key)),
      action: ACTIONS.find(a => a.id === goal.suggestedAction),
    }));
    setStep(1);
  };

  // Agregar keyword
  const handleAddKeyword = () => {
    if (config.keywordInput.trim() && !config.keywords.includes(config.keywordInput.trim())) {
      setConfig(prev => ({
        ...prev,
        keywords: [...prev.keywords, prev.keywordInput.trim()],
        keywordInput: '',
      }));
    }
  };

  // Remover keyword
  const handleRemoveKeyword = (keyword) => {
    setConfig(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword),
    }));
  };

  // Toggle campo
  const handleToggleField = (field) => {
    setConfig(prev => {
      const exists = prev.fields.find(f => f.key === field.key);
      return {
        ...prev,
        fields: exists 
          ? prev.fields.filter(f => f.key !== field.key)
          : [...prev.fields, field],
      };
    });
  };

  // Generar nodos del flujo
  const generateFlow = () => {
    const nodes = [];
    const edges = [];
    let y = 50;

    // Nodo de inicio
    nodes.push({
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 250, y },
      data: {
        label: 'Inicio',
        trigger: config.trigger?.id === 'keywords' ? 'onMessage' : config.trigger?.id,
        keywords: config.keywords,
      },
    });
    y += 130;

    // Nodo de recolección de datos (si hay campos)
    if (config.fields.length > 0) {
      nodes.push({
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y },
        data: {
          label: 'Recopilar datos',
          fields: config.fields.map(f => ({
            key: f.key,
            label: f.label,
            type: f.type,
            required: true,
          })),
        },
      });
      edges.push({ id: 'e1', source: 'trigger-1', target: 'collect-1' });
      y += 130;
    }

    // Nodo de acción
    const lastNodeId = config.fields.length > 0 ? 'collect-1' : 'trigger-1';
    
    if (config.action?.id === 'create' && config.selectedTable) {
      nodes.push({
        id: 'action-1',
        type: 'action',
        position: { x: 250, y },
        data: {
          label: 'Crear registro',
          actionType: 'create',
          tableId: config.selectedTable,
          fields: config.fields.map(f => ({ key: f.key, value: `{{${f.key}}}` })),
        },
      });
      edges.push({ id: `e${edges.length + 1}`, source: lastNodeId, target: 'action-1' });
      y += 130;

      // Respuesta de éxito
      nodes.push({
        id: 'response-1',
        type: 'response',
        position: { x: 250, y },
        data: {
          label: 'Confirmación',
          message: config.responseMessage || '✅ ¡Listo! Tus datos han sido guardados.',
        },
      });
      edges.push({ id: `e${edges.length + 1}`, source: 'action-1', target: 'response-1' });
    } else {
      // Solo responder
      nodes.push({
        id: 'response-1',
        type: 'response',
        position: { x: 250, y },
        data: {
          label: 'Respuesta',
          message: config.responseMessage || 'Gracias por tu mensaje.',
        },
      });
      edges.push({ id: `e${edges.length + 1}`, source: lastNodeId, target: 'response-1' });
    }

    return { nodes, edges };
  };

  // Crear el flujo
  const handleCreate = async () => {
    setLoading(true);
    try {
      const { nodes, edges } = generateFlow();
      await onCreate({
        name: config.name || config.goal?.label || 'Nuevo flujo',
        description: config.goal?.description || '',
        icon: config.goal?.icon,
        category: config.goal?.id === 'reservation' ? 'business' : 
                  config.goal?.id === 'faq' ? 'support' :
                  config.goal?.id === 'registration' ? 'crm' : 'automation',
        nodes,
        edges,
        trigger: config.trigger?.id,
      });
    } catch (err) {
      console.error('Error creating flow:', err);
    } finally {
      setLoading(false);
    }
  };

  // Renderizar paso
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => handleSelectGoal(goal)}
                  className="group p-5 rounded-2xl text-left transition-all hover:scale-[1.02] border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                    {goal.icon}
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{goal.label}</h3>
                  <p className="text-sm text-zinc-500">{goal.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            {/* Nombre del flujo */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Nombre del flujo
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Reservar cita"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Selección de trigger */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                ¿Cuándo se activa este flujo?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {TRIGGERS.map((trigger) => (
                  <button
                    key={trigger.id}
                    onClick={() => setConfig(prev => ({ ...prev, trigger }))}
                    className={`p-4 rounded-xl text-left transition-all border ${
                      config.trigger?.id === trigger.id
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xl mb-2 block">{trigger.icon}</span>
                    <p className="text-sm font-medium text-white">{trigger.label}</p>
                    <p className="text-xs text-zinc-500 mt-1">{trigger.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Keywords (si aplica) */}
            {config.trigger?.id === 'keywords' && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Palabras clave que activan el flujo
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={config.keywordInput}
                    onChange={(e) => setConfig(prev => ({ ...prev, keywordInput: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="Escribe y presiona Enter"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={handleAddKeyword}
                    className="px-4 py-2.5 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-sm"
                    >
                      {kw}
                      <button
                        onClick={() => handleRemoveKeyword(kw)}
                        className="hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <p className="text-zinc-400">
              Selecciona qué información necesitas recopilar del usuario
            </p>
            <div className="grid grid-cols-2 gap-3">
              {COMMON_FIELDS.map((field) => {
                const isSelected = config.fields.find(f => f.key === field.key);
                return (
                  <button
                    key={field.key}
                    onClick={() => handleToggleField(field)}
                    className={`p-4 rounded-xl text-left transition-all border ${
                      isSelected
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{field.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{field.label}</p>
                        <p className="text-xs text-zinc-500">Tipo: {field.type}</p>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-violet-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-zinc-500">
              {config.fields.length} campo{config.fields.length !== 1 ? 's' : ''} seleccionado{config.fields.length !== 1 ? 's' : ''}
            </p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                ¿Qué hacer con los datos?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setConfig(prev => ({ ...prev, action }))}
                    className={`p-4 rounded-xl text-left transition-all border ${
                      config.action?.id === action.id
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xl mb-2 block">{action.icon}</span>
                    <p className="text-sm font-medium text-white">{action.label}</p>
                    <p className="text-xs text-zinc-500 mt-1">{action.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Selección de tabla (si crea registro) */}
            {config.action?.id === 'create' && tables.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  ¿En qué tabla guardar?
                </label>
                <select
                  value={config.selectedTable || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, selectedTable: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50"
                >
                  <option value="">Selecciona una tabla</option>
                  {tables.map((table) => (
                    <option key={table._id} value={table._id}>{table.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Mensaje de respuesta */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Mensaje de confirmación
              </label>
              <textarea
                value={config.responseMessage}
                onChange={(e) => setConfig(prev => ({ ...prev, responseMessage: e.target.value }))}
                placeholder="Ej: ✅ ¡Tu reserva ha sido confirmada!"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¡Flujo configurado!</h3>
              <p className="text-zinc-400">Revisa el resumen y crea tu flujo</p>
            </div>

            {/* Resumen */}
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-zinc-400">Nombre</span>
                <span className="text-white font-medium">{config.name}</span>
              </div>
              <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-zinc-400">Trigger</span>
                <span className="text-white">{config.trigger?.label}</span>
              </div>
              {config.keywords.length > 0 && (
                <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-zinc-400">Keywords</span>
                  <span className="text-white">{config.keywords.join(', ')}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-zinc-400">Campos</span>
                <span className="text-white">{config.fields.length} campos</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-400">Acción</span>
                <span className="text-white">{config.action?.label}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div 
        className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-fade-up"
        style={{ 
          background: 'linear-gradient(180deg, rgba(15, 15, 20, 0.98) 0%, rgba(10, 10, 15, 0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {/* Header */}
        <div className="px-8 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{STEPS[step].title}</h2>
                <p className="text-sm text-zinc-500">{STEPS[step].desc}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  idx <= step ? 'bg-violet-500' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[60vh] overflow-y-auto">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
          <button
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {step === 0 ? 'Cancelar' : '← Anterior'}
          </button>
          
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !config.goal}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Crear flujo
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
