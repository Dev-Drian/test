/**
 * ActionNode - Nodo de acción automática
 * Color: Púrpura (#8b5cf6)
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { PlusIcon, EditIcon, RefreshIcon, BellIcon, CloseIcon, CheckIcon, TargetIcon, MinusIcon, MailIcon, BoltIcon, ClipboardIcon, ChatIcon, PhoneIcon, SearchIcon, SendIcon } from '../Icons';

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
  
  // Detectar modo vista: viene de flujo guardado o de plantilla con campos
  const isTemplateType = ['insert', 'update', 'notify', 'action'].includes(type);
  const isViewMode = data?.actionType || (data?.fields && data.fields.length > 0) || data?.tablePlaceholder || isTemplateType;
  
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
          </>
        ) : (
          /* Modo Edición (nuevo nodo) */
          <>
            <select 
              className="w-full px-2.5 py-2 rounded-xl text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all cursor-pointer"
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#d1d5db'
              }}
              value={data?.action || 'auto_create'}
              onChange={(e) => updateNodeData('action', e.target.value)}
            >
              <option value="auto_create">+ Crear</option>
              <option value="auto_assign">◎ Asignar</option>
              <option value="set_value">✎ Establecer</option>
              <option value="decrement">− Restar</option>
              <option value="increment">+ Sumar</option>
              <option value="send_notification">⚬ Notificar</option>
            </select>
            
            {(data?.action === 'set_value' || data?.action === 'decrement' || data?.action === 'increment') && (
              <div className="space-y-1.5">
                <input 
                  type="text" 
                  placeholder="Campo..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                  style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white'
                  }}
                  value={data?.field || ''}
                  onChange={(e) => updateNodeData('field', e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Valor..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                  style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white'
                  }}
                  value={data?.value || ''}
                  onChange={(e) => updateNodeData('value', e.target.value)}
                />
              </div>
            )}

            {/* UI para send_message - diseño intuitivo con pasos guiados */}
            {data?.action === 'send_message' && (
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
                    <label className="block text-[10px] text-cyan-400 mb-1.5">Número de teléfono</label>
                    <input 
                      type="text" 
                      placeholder="Ej: +57 300 123 4567"
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

                {/* PASO 2: Canal - solo si ya eligió destino */}
                {data?.targetType && (
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
                    </div>
                  </div>
                )}

                {/* PASO 3: Mensaje - solo si ya eligió canal */}
                {data?.targetType && data?.channel && (
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-bold text-white flex items-center justify-center">3</span>
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
                {data?.targetType && data?.channel && data?.message && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckIcon size="sm" className="text-emerald-400" />
                    <span className="text-xs text-emerald-400">¡Listo! El mensaje se enviará cuando se dispare este flujo</span>
                  </div>
                )}
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
