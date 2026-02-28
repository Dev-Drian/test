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
    <div className={`min-w-[240px] rounded-xl overflow-hidden transition-all shadow-xl ${
      selected 
        ? 'ring-2 ring-purple-400 shadow-purple-500/30' 
        : 'shadow-black/40'
    }`} style={{ background: '#0c0c0f' }}>
      {/* Handle de entrada */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#8b5cf6', borderColor: '#0c0c0f' }}
      />
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(139, 92, 246, 0.15)', borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: '#8b5cf6' }}>
          {actionInfo.icon}
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-purple-400">{nodeLabel}</span>
          <p className="text-[10px] text-purple-400/60">{actionInfo.label}</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Modo Vista (flujo guardado o plantilla) */}
        {isViewMode ? (
          <>
            {/* Tabla destino */}
            {(data?.targetTable || data?.tablePlaceholder) && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ 
                  background: 'rgba(139, 92, 246, 0.1)', 
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                <span className="text-purple-400"><ClipboardIcon size="sm" /></span>
                <span className="text-sm text-purple-300">
                  En <span className="font-semibold text-purple-400">{tableName}</span>
                </span>
              </div>
            )}
            
            {/* Filtro para updates */}
            {data?.filter && Object.keys(data.filter).length > 0 && (
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider" style={{ color: '#71717a' }}>
                  Donde
                </label>
                {Object.entries(data.filter).map(([key, val], idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                    style={{ 
                      background: 'rgba(139, 92, 246, 0.05)', 
                      border: '1px solid rgba(139, 92, 246, 0.1)',
                    }}
                  >
                    <span className="text-purple-300">{getFieldDisplayName(key)}</span>
                    <span className="text-zinc-600">=</span>
                    <span className="text-amber-400">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* RecordId para updates de plantillas */}
            {data?.recordId && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                style={{ 
                  background: 'rgba(251, 191, 36, 0.1)', 
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                }}
              >
                <span className="text-amber-300">🎯 Registro:</span>
                <span className="text-amber-400 truncate">{data.recordId}</span>
              </div>
            )}
            
            {/* Campos a modificar/crear */}
            {formattedFields && formattedFields.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider" style={{ color: '#71717a' }}>
                  {data.actionType === 'create' ? 'Crear con' : 'Cambiar'}
                </label>
                {formattedFields.slice(0, 4).map((field, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                    style={{ 
                      background: 'rgba(16, 185, 129, 0.05)', 
                      border: '1px solid rgba(16, 185, 129, 0.1)',
                    }}
                  >
                    <span className="text-emerald-400">{getFieldDisplayName(field.field)}</span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-amber-400 truncate max-w-[120px]" title={field.value}>
                      {field.value}
                    </span>
                  </div>
                ))}
                {formattedFields.length > 4 && (
                  <div className="text-[10px] text-zinc-500 pl-3">
                    +{formattedFields.length - 4} campos más...
                  </div>
                )}
              </div>
            )}
            
            {/* Canal de notificación (solo para notify) */}
            {(type === 'notify' || effectiveActionType === 'notify') && notifyChannel && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ 
                  background: 'rgba(251, 191, 36, 0.1)', 
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                }}
              >
                <span className="text-amber-400">🔔</span>
                <span className="text-amber-300">Canal: <span className="font-medium text-amber-400">{notifyChannel}</span></span>
              </div>
            )}
            
            {/* Mensaje de error/notificación */}
            {(data?.message || notifyMessage) && (
              <div className="px-3 py-2 rounded-lg text-xs"
                style={{ 
                  background: effectiveActionType === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                              effectiveActionType === 'notify' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(139, 92, 246, 0.1)', 
                  border: effectiveActionType === 'error' ? '1px solid rgba(239, 68, 68, 0.2)' : 
                          effectiveActionType === 'notify' ? '1px solid rgba(251, 191, 36, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
                  color: effectiveActionType === 'error' ? '#fca5a5' : 
                         effectiveActionType === 'notify' ? '#fcd34d' : '#c4b5fd'
                }}
              >
                <p className="whitespace-pre-line">{data?.message || notifyMessage}</p>
              </div>
            )}
          </>
        ) : (
          /* Modo Edición (nuevo nodo) */
          <>
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
                ¿Qué acción ejecutar?
              </label>
              <select 
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer appearance-none"
                style={{ 
                  background: '#18181b', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
                value={data?.action || 'auto_create'}
                onChange={(e) => updateNodeData('action', e.target.value)}
              >
                <option value="auto_create">+ Crear registro</option>
                <option value="auto_assign">◎ Asignar automáticamente</option>
                <option value="set_value">✎ Establecer valor</option>
                <option value="decrement">− Restar cantidad</option>
                <option value="increment">+ Sumar cantidad</option>
                <option value="send_notification">⚬ Enviar notificación</option>
                <option value="send_email">✉ Enviar email</option>
                <option value="send_message">📨 Enviar mensaje</option>
              </select>
            </div>
            
            {(data?.action === 'set_value' || data?.action === 'decrement' || data?.action === 'increment') && (
              <>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
                    ¿Qué campo modificar?
                  </label>
                  <input 
                    type="text" 
                    placeholder="ej: stock, estado, puntos..."
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder-zinc-500"
                    style={{ 
                      background: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white'
                    }}
                    value={data?.field || ''}
                    onChange={(e) => updateNodeData('field', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>
                    {data?.action === 'set_value' ? 'Nuevo valor' : 'Cantidad'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={data?.action === 'set_value' ? 'ej: confirmado, 100...' : 'ej: 1, 5, 10...'}
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder-zinc-500"
                    style={{ 
                      background: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white'
                    }}
                    value={data?.value || ''}
                    onChange={(e) => updateNodeData('value', e.target.value)}
                  />
                </div>
              </>
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
      
      {/* Handle de salida */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-4 !h-4 !rounded-full !border-2"
        style={{ background: '#8b5cf6', borderColor: '#0c0c0f' }}
      />
    </div>
  );
}
