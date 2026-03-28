/**
 * ActionNode - Nodo de acción automática
 * Color: Púrpura (#8b5cf6)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { PlusIcon, EditIcon, RefreshIcon, BellIcon, CloseIcon, CheckIcon, TargetIcon, MinusIcon, MailIcon, BoltIcon, ClipboardIcon, ChatIcon, PhoneIcon, SearchIcon, SendIcon, CalendarIcon, TableIcon, TelegramIcon } from '../Icons';

/**
 * Convierte nombres técnicos de campos a nombres amigables
 */
function getFieldDisplayName(fieldName) {
  // Mapeo de campos conocidos
  const fieldMappings = {
    'nombre': 'Nombre',
    'total': 'Total',
    'stock': 'Stock',
    'precio': 'Precio',
    'producto': 'Producto',
    'cliente': 'Cliente',
    'cantidad': 'Cantidad',
    'fechaCreacion': 'Fecha de creación',
    'fechaActualizacion': 'Fecha de actualización',
    'estadoPago': 'Estado de pago',
    'prioridad': 'Prioridad',
    'estado': 'Estado',
    'titulo': 'Título',
    'descripcion': 'Descripción',
    'productoData.stock': 'Stock del producto',
    'productoData.precio': 'Precio del producto',
    'productoData.nombre': 'Nombre del producto',
    'clienteData.nombre': 'Nombre del cliente',
    'clienteData.email': 'Email del cliente',
    'clienteData.telefono': 'Teléfono del cliente',
    'recordData.producto': 'Producto',
    'recordData.cliente': 'Cliente',
    'recordData.cantidad': 'Cantidad',
    'recordData.total': 'Total',
  };
  
  if (fieldMappings[fieldName]) {
    return fieldMappings[fieldName];
  }
  
  // Si contiene un punto, es una referencia anidada (ej: productoData.stock)
  if (fieldName.includes('.')) {
    const parts = fieldName.split('.');
    const lastPart = parts[parts.length - 1];
    const parentPart = parts[0].replace('Data', '').replace('data', '');
    
    // Capitalizar
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    const humanParent = capitalize(parentPart);
    const humanField = fieldMappings[lastPart] || capitalize(lastPart);
    
    return `${humanField} del ${humanParent.toLowerCase()}`;
  }
  
  // Convertir camelCase a texto normal
  const humanReadable = fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  
  return humanReadable;
}

/**
 * Formatea los campos de forma amigable
 * Soporta formato objeto {campo: valor} y array [{key, value}]
 */
function formatFields(fields) {
  if (!fields) return null;
  
  // Si es un array (formato plantilla), convertirlo
  if (Array.isArray(fields)) {
    return fields.map(f => ({
      field: f.key || f.field,
      value: f.value || ''
    }));
  }
  
  // Si es un objeto (formato sistema)
  if (typeof fields === 'object') {
    return Object.entries(fields).map(([key, value]) => ({
      field: key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
  }
  
  return null;
}

/**
 * Obtiene el icono y texto para el tipo de acción
 */
function getActionDisplay(actionType) {
  const actions = {
    'create': { icon: <PlusIcon size="sm" />, label: 'Crear registro', color: 'emerald' },
    'insert': { icon: <PlusIcon size="sm" />, label: 'Insertar registro', color: 'emerald' },  // Alias para plantillas
    'update': { icon: <EditIcon size="sm" />, label: 'Actualizar registro', color: 'amber' },
    'upsert': { icon: <RefreshIcon size="sm" />, label: 'Crear o actualizar', color: 'blue' },
    'notification': { icon: <BellIcon size="sm" />, label: 'Notificación', color: 'purple' },
    'notify': { icon: <BellIcon size="sm" />, label: 'Notificación', color: 'amber' },  // Alias para plantillas
    'error': { icon: <CloseIcon size="sm" />, label: 'Mostrar error', color: 'red' },
    'allow': { icon: <CheckIcon size="sm" />, label: 'Permitir', color: 'emerald' },
    'auto_create': { icon: <PlusIcon size="sm" />, label: 'Crear automático', color: 'emerald' },
    'auto_assign': { icon: <TargetIcon size="sm" />, label: 'Asignar automático', color: 'blue' },
    'set_value': { icon: <EditIcon size="sm" />, label: 'Establecer valor', color: 'amber' },
    'decrement': { icon: <MinusIcon size="sm" />, label: 'Restar cantidad', color: 'red' },
    'increment': { icon: <PlusIcon size="sm" />, label: 'Sumar cantidad', color: 'emerald' },
    'send_notification': { icon: <BellIcon size="sm" />, label: 'Enviar notificación', color: 'purple' },
    'send_email': { icon: <MailIcon size="sm" />, label: 'Enviar email', color: 'blue' },
    'send_message': { icon: <MailIcon size="sm" />, label: 'Enviar mensaje', color: 'cyan' },
    'telegram': { icon: <SendIcon size="sm" />, label: 'Telegram', color: 'sky' },
    // Integraciones Google
    'google_calendar_event': { icon: <CalendarIcon size="sm" />, label: 'Google Calendar', color: 'red' },
    'google_sheets_row': { icon: <TableIcon size="sm" />, label: 'Google Sheets', color: 'green' },
    'generate_payment_link': { icon: <CreditCard className="w-4 h-4" />, label: 'Generar link de pago', color: 'emerald' },
  };
  return actions[actionType] || { icon: <BoltIcon size="sm" />, label: actionType || 'Acción', color: 'purple' };
}

export default function ActionNode({ id, data, selected, type }) {
  const { setNodes } = useReactFlow();

  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  // Detectar tipo de acción: de data.actionType, data.action, o del tipo de nodo (plantillas)
  const effectiveActionType = data?.actionType || data?.action || type;
  const actionInfo = getActionDisplay(effectiveActionType);
  const formattedFields = formatFields(data?.fields);
  
  // Auto-configurar nodos de telegram
  useEffect(() => {
    if (type === 'telegram') {
      if (!data?.channel) {
        updateNodeData('channel', 'telegram');
      }
      if (!data?.actionType) {
        updateNodeData('actionType', 'send_message');
      }
      // Auto-seleccionar "número fijo" para Telegram
      if (!data?.targetType) {
        updateNodeData('targetType', 'fixed');
      }
    }
  }, [type, data?.channel, data?.actionType, data?.targetType, updateNodeData]);
  
  // Detectar modo vista: viene de flujo guardado o de plantilla con campos
  // Excluir 'telegram' del modo vista para que siempre muestre el formulario
  const isTemplateType = ['insert', 'update', 'notify', 'action'].includes(type);
  const isTelegramType = type === 'telegram';
  const isViewMode = !isTelegramType && (data?.actionType || (data?.fields && data.fields.length > 0) || data?.tablePlaceholder || isTemplateType);
  
  // Obtener nombre de tabla
  const tableName = data?.targetTableName || data?.tablePlaceholder || 'Tabla';
  
  // Label del nodo
  const nodeLabel = data?.label || 'Acción';
  
  // Para notificaciones, obtener canal y mensaje
  const notifyChannel = data?.channel;
  const notifyMessage = data?.message;

  return (
    <div 
      className={`min-w-[180px] max-w-[240px] rounded-2xl overflow-visible transition-all duration-300 ${
        selected 
          ? 'ring-2 ring-purple-400/60 shadow-2xl shadow-purple-500/20' 
          : 'shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-purple-500/10'
      }`} 
      style={{ 
        background: 'linear-gradient(145deg, #1a1a24, #141418)',
        border: '1px solid rgba(139, 92, 246, 0.2)'
      }}
    >
      {/* Handle de entrada - Estilo n8n */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3 !h-3 !rounded-full !border-2 !-left-1.5"
        style={{ 
          background: '#8b5cf6', 
          borderColor: '#1a1a24',
          boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)'
        }}
      />
      
      {/* Header compacto estilo n8n */}
      <div 
        className="px-3 py-2.5 flex items-center gap-2.5" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(139, 92, 246, 0.05))',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)' 
        }}
      >
        <div 
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
          }}
        >
          {actionInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-purple-300 block truncate">{nodeLabel}</span>
          <span className="text-[10px] text-purple-500/70">{actionInfo.label}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Modo Vista (flujo guardado o plantilla) */}
        {isViewMode ? (
          <>
            {/* Tabla destino */}
            {(data?.targetTable || data?.tablePlaceholder) && (
              <div 
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px]"
                style={{ 
                  background: 'rgba(139, 92, 246, 0.08)', 
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                }}
              >
                <span className="text-purple-400"><ClipboardIcon size="xs" /></span>
                <span className="text-purple-300 truncate">{tableName}</span>
              </div>
            )}
            
            {/* Filtro para updates */}
            {data?.filter && Object.keys(data.filter).length > 0 && (
              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-medium">
                  Donde
                </label>
                {Object.entries(data.filter).slice(0, 2).map(([key, val], idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]"
                    style={{ 
                      background: 'rgba(139, 92, 246, 0.05)', 
                      border: '1px solid rgba(139, 92, 246, 0.1)',
                    }}
                  >
                    <span className="text-purple-300">{getFieldDisplayName(key)}</span>
                    <span className="text-slate-600">=</span>
                    <span className="text-amber-400 truncate">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Campos a modificar/crear */}
            {formattedFields && formattedFields.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-medium">
                  {data.actionType === 'create' ? 'Crear' : 'Cambiar'}
                </label>
                {formattedFields.slice(0, 3).map((field, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]"
                    style={{ 
                      background: 'rgba(16, 185, 129, 0.05)', 
                      border: '1px solid rgba(16, 185, 129, 0.1)',
                    }}
                  >
                    <span className="text-emerald-400 truncate">{getFieldDisplayName(field.field)}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-amber-400 truncate max-w-[80px]">{field.value}</span>
                  </div>
                ))}
                {formattedFields.length > 3 && (
                  <span className="text-[9px] text-slate-500 pl-2">
                    +{formattedFields.length - 3} más
                  </span>
                )}
              </div>
            )}
            
            {/* Mensaje */}
            {(data?.message || notifyMessage) && (
              <div 
                className="px-2.5 py-1.5 rounded-xl text-[10px] line-clamp-2"
                style={{ 
                  background: effectiveActionType === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(139, 92, 246, 0.08)', 
                  border: effectiveActionType === 'error' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(139, 92, 246, 0.15)',
                  color: effectiveActionType === 'error' ? '#fca5a5' : '#c4b5fd'
                }}
              >
                {(data?.message || notifyMessage).slice(0, 50)}...
              </div>
            )}

            {/* Payment Link preview */}
            {effectiveActionType === 'generate_payment_link' && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px]"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-emerald-300 truncate">
                    {data?.payment?.amountSource === 'fixed'
                      ? `${data.payment.amountFixed?.toLocaleString()} ${data.payment.currency || 'COP'}`
                      : `campo: ${data?.payment?.amountField || 'precio'}`}
                  </span>
                </div>
                {data?.payment?.description && (
                  <div className="px-2.5 py-1 rounded-lg text-[10px] text-zinc-400 truncate"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {data.payment.description.slice(0, 40)}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Modo Edición (nuevo nodo) */
          <>
            <select 
              className="w-full px-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer appearance-none"
              style={{ 
                background: '#1e1e2a', 
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#c4b5fd',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238b5cf6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                backgroundSize: '16px',
                paddingRight: '32px'
              }}
              value={data?.action || 'auto_create'}
              onChange={(e) => updateNodeData('action', e.target.value)}
            >
              <option value="auto_create" style={{ background: '#1e1e2a', color: '#4ade80' }}>+ Crear</option>
              <option value="auto_assign" style={{ background: '#1e1e2a', color: '#60a5fa' }}>◎ Asignar</option>
              <option value="set_value" style={{ background: '#1e1e2a', color: '#fcd34d' }}>Establecer</option>
              <option value="decrement" style={{ background: '#1e1e2a', color: '#f87171' }}>− Restar</option>
              <option value="increment" style={{ background: '#1e1e2a', color: '#34d399' }}>+ Sumar</option>
              <option value="send_notification" style={{ background: '#1e1e2a', color: '#a78bfa' }}>Notificar</option>
              <option disabled style={{ background: '#1e1e2a', color: '#64748b' }}>── Google ──</option>
              <option value="google_calendar_event" style={{ background: '#1e1e2a', color: '#f87171' }}>▷ Calendar</option>
              <option value="google_sheets_row" style={{ background: '#1e1e2a', color: '#4ade80' }}>▢ Sheets</option>
            </select>
            
            {(data?.action === 'set_value' || data?.action === 'decrement' || data?.action === 'increment') && (
              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Campo..."
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-slate-500"
                  style={{ 
                    background: '#1e1e2a', 
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9'
                  }}
                  value={data?.field || ''}
                  onChange={(e) => updateNodeData('field', e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Valor..."
                  className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-slate-500"
                  style={{ 
                    background: '#1e1e2a', 
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#f1f5f9'
                  }}
                  value={data?.value || ''}
                  onChange={(e) => updateNodeData('value', e.target.value)}
                />
              </div>
            )}

            {/* UI para send_message - diseño intuitivo con pasos guiados */}
            {(data?.action === 'send_message' || type === 'telegram') && (
              <div className="space-y-3">
                
                {/* PASO 1: Destinatario */}
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                  <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-bold text-white flex items-center justify-center">1</span>
                    <span className="text-xs font-medium text-cyan-400">¿A quién enviar?</span>
                  </div>
                  <div className="p-2 space-y-1.5" style={{ background: '#18181b' }}>
                    {/* Opción: Responder al chat */}
                    <button
                      type="button"
                      onClick={() => updateNodeData('targetType', 'origin_chat')}
                      className={`w-full p-2.5 rounded-lg flex items-center gap-3 transition-all ${
                        data?.targetType === 'origin_chat' 
                          ? 'bg-cyan-500/20 ring-1 ring-cyan-500' 
                          : 'bg-zinc-800/50 hover:bg-zinc-700/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${data?.targetType === 'origin_chat' ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                        <ChatIcon size="sm" className="text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-xs font-medium text-white">Responder al chat</div>
                        <div className="text-[10px] text-zinc-400">Al usuario que inició esta acción</div>
                      </div>
                      {data?.targetType === 'origin_chat' && <CheckIcon size="sm" className="text-cyan-400" />}
                    </button>

                    {/* Opción: Número fijo */}
                    <button
                      type="button"
                      onClick={() => updateNodeData('targetType', 'fixed')}
                      className={`w-full p-2.5 rounded-lg flex items-center gap-3 transition-all ${
                        data?.targetType === 'fixed' 
                          ? 'bg-cyan-500/20 ring-1 ring-cyan-500' 
                          : 'bg-zinc-800/50 hover:bg-zinc-700/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${data?.targetType === 'fixed' ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                        <PhoneIcon size="sm" className="text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-xs font-medium text-white">Número específico</div>
                        <div className="text-[10px] text-zinc-400">Enviar siempre al mismo número</div>
                      </div>
                      {data?.targetType === 'fixed' && <CheckIcon size="sm" className="text-cyan-400" />}
                    </button>

                    {/* Opción: Campo del registro */}
                    <button
                      type="button"
                      onClick={() => updateNodeData('targetType', 'record_field')}
                      className={`w-full p-2.5 rounded-lg flex items-center gap-3 transition-all ${
                        data?.targetType === 'record_field' 
                          ? 'bg-cyan-500/20 ring-1 ring-cyan-500' 
                          : 'bg-zinc-800/50 hover:bg-zinc-700/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${data?.targetType === 'record_field' ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                        <ClipboardIcon size="sm" className="text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-xs font-medium text-white">Teléfono del registro</div>
                        <div className="text-[10px] text-zinc-400">Usar el número guardado en el registro</div>
                      </div>
                      {data?.targetType === 'record_field' && <CheckIcon size="sm" className="text-cyan-400" />}
                    </button>

                    {/* Opción: Buscar en tabla */}
                    <button
                      type="button"
                      onClick={() => updateNodeData('targetType', 'table_query')}
                      className={`w-full p-2.5 rounded-lg flex items-center gap-3 transition-all ${
                        data?.targetType === 'table_query' 
                          ? 'bg-cyan-500/20 ring-1 ring-cyan-500' 
                          : 'bg-zinc-800/50 hover:bg-zinc-700/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${data?.targetType === 'table_query' ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                        <SearchIcon size="sm" className="text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-xs font-medium text-white">Buscar en otra tabla</div>
                        <div className="text-[10px] text-zinc-400">Ej: notificar a empleados de cocina</div>
                      </div>
                      {data?.targetType === 'table_query' && <CheckIcon size="sm" className="text-cyan-400" />}
                    </button>
                  </div>
                </div>

                {/* Campos extra según tipo de destino */}
                {data?.targetType === 'fixed' && (
                  <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                    <label className="block text-[10px] text-cyan-400 mb-1.5">
                      {type === 'telegram' || data?.channel === 'telegram' ? 'Chat ID de Telegram' : 'Número de teléfono'}
                    </label>
                    <input 
                      type="text" 
                      placeholder={type === 'telegram' || data?.channel === 'telegram' ? 'Ej: 6979556376' : 'Ej: +57 300 123 4567'}
                      className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500"
                      style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      value={data?.targetValue || ''}
                      onChange={(e) => updateNodeData('targetValue', e.target.value)}
                    />
                  </div>
                )}

                {data?.targetType === 'record_field' && (
                  <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                    <label className="block text-[10px] text-cyan-400 mb-1.5">Nombre del campo con el teléfono</label>
                    <input 
                      type="text" 
                      placeholder="Ej: telefono, celular, whatsapp"
                      className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500"
                      style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      value={data?.targetField || ''}
                      onChange={(e) => updateNodeData('targetField', e.target.value)}
                    />
                  </div>
                )}

                {data?.targetType === 'table_query' && (
                  <div className="space-y-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                    <div>
                      <label className="block text-[10px] text-cyan-400 mb-1.5">Tabla donde buscar</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Empleados, Repartidores"
                        className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500"
                        style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        value={data?.queryTable || ''}
                        onChange={(e) => updateNodeData('queryTable', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-cyan-400 mb-1.5">Filtro (opcional)</label>
                      <input 
                        type="text" 
                        placeholder='Ej: rol = "cocina"'
                        className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500"
                        style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        value={data?.queryFilter || ''}
                        onChange={(e) => updateNodeData('queryFilter', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-cyan-400 mb-1.5">Campo del teléfono</label>
                      <input 
                        type="text" 
                        placeholder="Ej: telefono, celular"
                        className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500"
                        style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        value={data?.targetField || ''}
                        onChange={(e) => updateNodeData('targetField', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* PASO 2: Canal - solo si ya eligió destino Y NO es nodo telegram (ya tiene canal definido) */}
                {data?.targetType && type !== 'telegram' && (
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-bold text-white flex items-center justify-center">2</span>
                      <span className="text-xs font-medium text-cyan-400">¿Por dónde enviar?</span>
                    </div>
                    <div className="p-2 flex gap-2" style={{ background: '#18181b' }}>
                      {/* Chat del bot */}
                      <button
                        type="button"
                        onClick={() => updateNodeData('channel', 'chat')}
                        className={`flex-1 p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                          data?.channel === 'chat' 
                            ? 'bg-cyan-500/20 ring-1 ring-cyan-500' 
                            : 'bg-zinc-800/50 hover:bg-zinc-700/50'
                        }`}
                      >
                        <ChatIcon size="md" className={data?.channel === 'chat' ? 'text-cyan-400' : 'text-zinc-400'} />
                        <span className="text-[10px] text-zinc-300">Chat</span>
                      </button>

                      {/* Notificación */}
                      <button
                        type="button"
                        onClick={() => updateNodeData('channel', 'in_app')}
                        className={`flex-1 p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                          data?.channel === 'in_app' 
                            ? 'bg-cyan-500/20 ring-1 ring-cyan-500' 
                            : 'bg-zinc-800/50 hover:bg-zinc-700/50'
                        }`}
                      >
                        <BellIcon size="md" className={data?.channel === 'in_app' ? 'text-cyan-400' : 'text-zinc-400'} />
                        <span className="text-[10px] text-zinc-300">Notificación</span>
                      </button>

                      {/* WhatsApp (próximamente) */}
                      <button
                        type="button"
                        disabled
                        className="flex-1 p-2 rounded-lg flex flex-col items-center gap-1 bg-zinc-900/50 opacity-40 cursor-not-allowed"
                        title="Próximamente"
                      >
                        <PhoneIcon size="md" className="text-zinc-500" />
                        <span className="text-[10px] text-zinc-500">WhatsApp</span>
                      </button>

                      {/* Telegram */}
                      <button
                        type="button"
                        onClick={() => updateNodeData('channel', 'telegram')}
                        className={`flex-1 p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                          data?.channel === 'telegram' 
                            ? 'bg-cyan-500/20 ring-1 ring-cyan-500' 
                            : 'bg-zinc-800/50 hover:bg-zinc-700/50'
                        }`}
                      >
                        <TelegramIcon size="md" className={data?.channel === 'telegram' ? 'text-cyan-400' : 'text-zinc-400'} />
                        <span className="text-[10px] text-zinc-300">Telegram</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* PASO 3: Mensaje - solo si ya eligió canal (o es telegram que ya tiene canal) */}
                {data?.targetType && (data?.channel || type === 'telegram') && (
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-bold text-white flex items-center justify-center">{type === 'telegram' ? '2' : '3'}</span>
                      <span className="text-xs font-medium text-cyan-400">Escribe el mensaje</span>
                    </div>
                    <div className="p-2" style={{ background: '#18181b' }}>
                      <textarea 
                        placeholder="Ej: ¡Nuevo pedido de {{cliente}}! Total: ${{total}}"
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500 resize-none"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        value={data?.message || ''}
                        onChange={(e) => updateNodeData('message', e.target.value)}
                      />
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <span className="text-cyan-500"><TargetIcon size="xs" /></span>
                        <span className="text-[10px] text-zinc-400">
                          Usa <code className="bg-zinc-800 px-1 rounded text-cyan-400">{'{{campo}}'}</code> para datos del registro
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Indicador de completado */}
                {data?.targetType && (data?.channel || type === 'telegram') && data?.message && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckIcon size="sm" className="text-emerald-400" />
                    <span className="text-xs text-emerald-400">
                      {type === 'telegram' 
                        ? '¡Listo! Se enviará a Telegram cuando se ejecute el flujo' 
                        : '¡Listo! El mensaje se enviará cuando se dispare este flujo'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* UI para Google Calendar */}
            {data?.action === 'google_calendar_event' && (
              <div className="space-y-3">
                {/* Header Google Calendar */}
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <CalendarIcon size="sm" className="text-red-400" />
                  <span className="text-xs font-medium text-red-300">Crear evento en Google Calendar</span>
                </div>
                
                {/* Título del evento */}
                <div>
                  <label className="block text-[10px] text-red-400 mb-1.5">Título del evento</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Reserva de {{cliente}}"
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500"
                    style={{ background: '#18181b', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'white' }}
                    value={data?.eventTitle || ''}
                    onChange={(e) => updateNodeData('eventTitle', e.target.value)}
                  />
                </div>

                {/* Fecha inicio */}
                <div>
                  <label className="block text-[10px] text-red-400 mb-1.5">Campo de fecha (de la tabla)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: fecha_reserva, fechaInicio"
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500"
                    style={{ background: '#18181b', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'white' }}
                    value={data?.dateField || ''}
                    onChange={(e) => updateNodeData('dateField', e.target.value)}
                  />
                </div>

                {/* Duración */}
                <div>
                  <label className="block text-[10px] text-red-400 mb-1.5">Duración (horas)</label>
                  <input 
                    type="number" 
                    placeholder="1"
                    min="0.5"
                    step="0.5"
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500"
                    style={{ background: '#18181b', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'white' }}
                    value={data?.duration || '1'}
                    onChange={(e) => updateNodeData('duration', e.target.value)}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-[10px] text-red-400 mb-1.5">Descripción (opcional)</label>
                  <textarea 
                    placeholder="Ej: Cliente: {{cliente}}, Tel: {{telefono}}"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500 resize-none"
                    style={{ background: '#18181b', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'white' }}
                    value={data?.eventDescription || ''}
                    onChange={(e) => updateNodeData('eventDescription', e.target.value)}
                  />
                </div>

                {/* Ayuda */}
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                  <span className="text-[10px] text-zinc-400">
                    Tip: Usa <code className="bg-zinc-800 px-1 rounded text-red-400">{'{{campo}}'}</code> para insertar datos del registro
                  </span>
                </div>
              </div>
            )}

            {/* UI para Google Sheets */}
            {data?.action === 'google_sheets_row' && (
              <div className="space-y-3">
                {/* Header Google Sheets */}
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <TableIcon size="sm" className="text-green-400" />
                  <span className="text-xs font-medium text-green-300">Añadir fila a Google Sheets</span>
                </div>
                
                {/* ID de la hoja */}
                <div>
                  <label className="block text-[10px] text-green-400 mb-1.5">ID de la hoja de cálculo</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500"
                    style={{ background: '#18181b', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'white' }}
                    value={data?.spreadsheetId || ''}
                    onChange={(e) => updateNodeData('spreadsheetId', e.target.value)}
                  />
                  <span className="text-[9px] text-zinc-500 mt-1 block">
                    Encuéntralo en la URL: docs.google.com/spreadsheets/d/<span className="text-green-400">ID_AQUÍ</span>/edit
                  </span>
                </div>

                {/* Nombre de la pestaña */}
                <div>
                  <label className="block text-[10px] text-green-400 mb-1.5">Nombre de la pestaña</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Reservas, Sheet1"
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500"
                    style={{ background: '#18181b', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'white' }}
                    value={data?.sheetName || 'Sheet1'}
                    onChange={(e) => updateNodeData('sheetName', e.target.value)}
                  />
                </div>

                {/* Mapeo de campos */}
                <div>
                  <label className="block text-[10px] text-green-400 mb-1.5">Campos a exportar (uno por línea)</label>
                  <textarea 
                    placeholder="Columna: {{campo}}&#10;Fecha: {{fecha_reserva}}&#10;Cliente: {{nombre}}"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder-zinc-500 resize-none font-mono"
                    style={{ background: '#18181b', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'white' }}
                    value={data?.fieldMapping || ''}
                    onChange={(e) => updateNodeData('fieldMapping', e.target.value)}
                  />
                </div>

                {/* Ayuda */}
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.05)' }}>
                  <span className="text-[10px] text-zinc-400">
                    Asegurate de que los nombres de columna coincidan con tu Google Sheet
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Handle de salida - Estilo n8n */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !rounded-full !border-2 !-right-1.5"
        style={{ 
          background: '#8b5cf6', 
          borderColor: '#1a1a24',
          boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)'
        }}
      />
    </div>
  );
}
