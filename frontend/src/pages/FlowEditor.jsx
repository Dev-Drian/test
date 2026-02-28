/**
 * FlowEditor - Editor visual de flujos intuitivo
 * Diseñado para usuarios sin conocimientos técnicos
 */
import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { api } from '../api/client';

// Nodos personalizados
import TriggerNode from '../components/nodes/TriggerNode';
import TableNode from '../components/nodes/TableNode';
import ConditionNode from '../components/nodes/ConditionNode';
import ActionNode from '../components/nodes/ActionNode';
import AvailabilityNode from '../components/nodes/AvailabilityNode';
import ResponseNode from '../components/nodes/ResponseNode';
import QueryNode from '../components/nodes/QueryNode';
import DefaultNode from '../components/nodes/DefaultNode';
import CollectNode from '../components/nodes/CollectNode';
import { RocketIcon, SearchIcon, SplitIcon, BoltIcon, CalendarIcon, ChatIcon, EditIcon, TrashIcon, ClipboardIcon, LightBulbIcon, TargetIcon, SparklesIcon, LinkIcon, FolderIcon, PlusIcon, ClockIcon, BellIcon, SwitchIcon, LoopIcon, TimerIcon, EmailIcon, WhatsAppIcon, SmsIcon, WebhookIcon, GlobeIcon, TransformIcon, VariableIcon, NoteIcon, CheckCircleIcon, FormIcon, ErrorIcon, SubflowIcon } from '../components/Icons';

// Mapeo de tipos de nodos - incluye aliases para plantillas
const nodeTypes = {
  // Tipos principales
  trigger: TriggerNode,
  table: TableNode,
  condition: ConditionNode,
  action: ActionNode,
  availability: AvailabilityNode,
  response: ResponseNode,
  query: QueryNode,
  collect: CollectNode,
  default: DefaultNode,
  // Aliases para compatibilidad con plantillas
  start: TriggerNode,      // 'start' → usa TriggerNode
  insert: ActionNode,      // 'insert' → usa ActionNode
  update: ActionNode,      // 'update' → usa ActionNode
  notify: ActionNode,      // 'notify' → usa ActionNode
  message: ResponseNode,   // 'message' → usa ResponseNode
  // Nuevos tipos
  schedule: TriggerNode,      // Disparador programado
  create: ActionNode,         // Crear registro
  delete: ActionNode,         // Eliminar registro
  switch: ConditionNode,      // Switch múltiples condiciones
  loop: ActionNode,           // Repetir para cada item
  wait: ActionNode,           // Esperar tiempo
  email: ActionNode,          // Enviar email
  whatsapp: ActionNode,       // Enviar WhatsApp
  notification: ActionNode,   // Notificación interna
  sms: ActionNode,            // Enviar SMS
  webhook: ActionNode,        // Llamar webhook
  http: ActionNode,           // Petición HTTP
  transform: ActionNode,      // Transformar datos
  set_variable: ActionNode,   // Guardar variable
  note: DefaultNode,          // Nota/comentario
  approval: ActionNode,       // Aprobación manual
  form: CollectNode,          // Formulario
  error_handler: ActionNode,  // Manejo de errores
  subflow: ActionNode,        // Ejecutar subflujo
};

// Iconos SVG
const Icons = {
  flow: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  save: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  help: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  ),
  folder: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  // Iconos para plantillas de flujos
  mail: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  question: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  'calendar-check': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6l2 2 4-4" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  'user-plus': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  ),
  phone: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  'bell-ring': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" />
    </svg>
  ),
  star: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  gift: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  ),
  'file-text': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 9h3.75m-3.75 3h3.75m-3.75 3h3.75M6 18.75V6.375c0-.621.504-1.125 1.125-1.125h5.25L18 10.5v8.25c0 .621-.504 1.125-1.125 1.125H7.125A1.125 1.125 0 016 18.75z" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  bolt: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
};

// Función para obtener icono por nombre
const getTemplateIcon = (iconName) => {
  if (!iconName) return Icons.document;
  if (typeof iconName !== 'string') return iconName; // Ya es un elemento JSX
  const icon = Icons[iconName];
  return icon || Icons.document;
};

// Bloques disponibles organizados por categorías
const blockCategories = [
  {
    id: 'triggers',
    label: 'Disparadores',
    icon: '⚡',
    description: 'Inician el flujo',
    blocks: [
      { 
        type: 'trigger', 
        icon: <RocketIcon size="md" />,
        label: 'Inicio', 
        color: '#10b981',
        description: 'Cuando algo sucede',
        help: 'Define qué evento dispara el flujo: un mensaje, un webhook, etc.'
      },
      { 
        type: 'schedule', 
        icon: <ClockIcon size="md" />,
        label: 'Programado', 
        color: '#10b981',
        description: 'En fecha/hora',
        help: 'Ejecuta el flujo en un horario específico: diario, semanal, etc.'
      },
    ]
  },
  {
    id: 'data',
    label: 'Datos',
    icon: '📊',
    description: 'Consultar y modificar',
    blocks: [
      { 
        type: 'query', 
        icon: <SearchIcon size="md" />,
        label: 'Consulta', 
        color: '#3b82f6',
        description: 'Buscar datos',
        help: 'Busca información en tus tablas. Ej: ver si hay disponibilidad.'
      },
      { 
        type: 'create', 
        icon: <PlusIcon size="md" />,
        label: 'Crear', 
        color: '#22c55e',
        description: 'Nuevo registro',
        help: 'Crea un nuevo registro en una tabla. Ej: nueva cita, nuevo cliente.'
      },
      { 
        type: 'update', 
        icon: <EditIcon size="md" />,
        label: 'Actualizar', 
        color: '#f59e0b',
        description: 'Modificar registro',
        help: 'Actualiza un registro existente. Ej: cambiar estado de cita.'
      },
      { 
        type: 'delete', 
        icon: <TrashIcon size="md" />,
        label: 'Eliminar', 
        color: '#ef4444',
        description: 'Borrar registro',
        help: 'Elimina un registro de la tabla. Usa con precaución.'
      },
    ]
  },
  {
    id: 'logic',
    label: 'Lógica',
    icon: '🧠',
    description: 'Decisiones y control',
    blocks: [
      { 
        type: 'condition', 
        icon: <SplitIcon size="md" />,
        label: 'Condición', 
        color: '#f59e0b',
        description: '¿Sí o no?',
        help: 'Toma un camino u otro según una condición. Ej: si hay espacio → reservar.'
      },
      { 
        type: 'switch', 
        icon: <SwitchIcon size="md" />,
        label: 'Switch', 
        color: '#f59e0b',
        description: 'Múltiples caminos',
        help: 'Evalúa múltiples condiciones y elige un camino. Ej: según tipo de cliente.'
      },
      { 
        type: 'loop', 
        icon: <LoopIcon size="md" />,
        label: 'Repetir', 
        color: '#8b5cf6',
        description: 'Para cada item',
        help: 'Repite acciones para cada elemento de una lista.'
      },
      { 
        type: 'wait', 
        icon: <TimerIcon size="md" />,
        label: 'Esperar', 
        color: '#06b6d4',
        description: 'Pausar tiempo',
        help: 'Espera un tiempo antes de continuar. Ej: esperar 1 hora para follow-up.'
      },
    ]
  },
  {
    id: 'communication',
    label: 'Comunicación',
    icon: '💬',
    description: 'Mensajes y notificaciones',
    blocks: [
      { 
        type: 'response', 
        icon: <ChatIcon size="md" />,
        label: 'Respuesta', 
        color: '#ec4899',
        description: 'Mensaje al usuario',
        help: 'Envía un mensaje al usuario. Puedes incluir datos dinámicos.'
      },
      { 
        type: 'email', 
        icon: <EmailIcon size="md" />,
        label: 'Email', 
        color: '#3b82f6',
        description: 'Enviar correo',
        help: 'Envía un correo electrónico. Ideal para confirmaciones.'
      },
      { 
        type: 'whatsapp', 
        icon: <WhatsAppIcon size="md" />,
        label: 'WhatsApp', 
        color: '#25d366',
        description: 'Enviar mensaje',
        help: 'Envía un mensaje de WhatsApp al cliente.'
      },
      { 
        type: 'notification', 
        icon: <BellIcon size="md" />,
        label: 'Notificación', 
        color: '#f59e0b',
        description: 'Alertar al equipo',
        help: 'Envía una notificación interna a tu equipo.'
      },
      { 
        type: 'sms', 
        icon: <SmsIcon size="md" />,
        label: 'SMS', 
        color: '#8b5cf6',
        description: 'Mensaje de texto',
        help: 'Envía un SMS al número del cliente.'
      },
    ]
  },
  {
    id: 'integrations',
    label: 'Integraciones',
    icon: '🔗',
    description: 'Conectar servicios externos',
    blocks: [
      { 
        type: 'webhook', 
        icon: <WebhookIcon size="md" />,
        label: 'Webhook', 
        color: '#6366f1',
        description: 'Llamar API externa',
        help: 'Conecta con servicios externos: Zapier, Make, APIs.'
      },
      { 
        type: 'http', 
        icon: <GlobeIcon size="md" />,
        label: 'HTTP Request', 
        color: '#06b6d4',
        description: 'Petición HTTP',
        help: 'Realiza peticiones HTTP a cualquier URL.'
      },
    ]
  },
  {
    id: 'utils',
    label: 'Utilidades',
    icon: '🛠️',
    description: 'Herramientas auxiliares',
    blocks: [
      { 
        type: 'availability', 
        icon: <CalendarIcon size="md" />,
        label: 'Horario', 
        color: '#06b6d4',
        description: 'Ver disponibilidad',
        help: 'Verifica horarios de atención y disponibilidad.'
      },
      { 
        type: 'transform', 
        icon: <TransformIcon size="md" />,
        label: 'Transformar', 
        color: '#8b5cf6',
        description: 'Modificar datos',
        help: 'Transforma datos: formatear fechas, calcular valores, etc.'
      },
      { 
        type: 'set_variable', 
        icon: <VariableIcon size="md" />,
        label: 'Variable', 
        color: '#64748b',
        description: 'Guardar valor',
        help: 'Guarda un valor temporal para usar más adelante en el flujo.'
      },
      { 
        type: 'note', 
        icon: <NoteIcon size="md" />,
        label: 'Nota', 
        color: '#94a3b8',
        description: 'Comentario',
        help: 'Agrega una nota para documentar el flujo. No afecta la ejecución.'
      },
    ]
  },
  {
    id: 'advanced',
    label: 'Avanzado',
    icon: '⚙️',
    description: 'Funciones especiales',
    blocks: [
      { 
        type: 'approval', 
        icon: <CheckCircleIcon size="md" />,
        label: 'Aprobación', 
        color: '#10b981',
        description: 'Esperar confirmación',
        help: 'Pausa el flujo hasta que alguien apruebe manualmente.'
      },
      { 
        type: 'form', 
        icon: <FormIcon size="md" />,
        label: 'Formulario', 
        color: '#ec4899',
        description: 'Solicitar datos',
        help: 'Solicita información al usuario paso a paso.'
      },
      { 
        type: 'error_handler', 
        icon: <ErrorIcon size="md" />,
        label: 'Error', 
        color: '#ef4444',
        description: 'Manejar fallos',
        help: 'Define qué hacer si algo falla en el flujo.'
      },
      { 
        type: 'subflow', 
        icon: <SubflowIcon size="md" />,
        label: 'Subflujo', 
        color: '#6366f1',
        description: 'Ejecutar otro flujo',
        help: 'Ejecuta otro flujo como parte de este. Reutiliza lógica.'
      },
    ]
  },
];

// Lista plana para compatibilidad
const availableBlocks = blockCategories.flatMap(cat => cat.blocks);

// Toast notification component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'from-sky-500/20 to-sky-500/5 border-sky-500/30' :
                  type === 'error' ? 'from-red-500/20 to-red-500/5 border-red-500/30' :
                  'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30';
  
  const iconColor = type === 'success' ? 'text-sky-400' :
                    type === 'error' ? 'text-red-400' : 'text-indigo-400';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${bgColor} border backdrop-blur-sm shadow-xl animate-slide-in`}>
      <div className={iconColor}>
        {type === 'success' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : type === 'error' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-100 font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-200 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// Confirm modal component
const ConfirmModal = ({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, type = 'danger' }) => {
  if (!isOpen) return null;
  
  const buttonColor = type === 'danger' ? 'bg-red-500 hover:bg-red-400' : 'bg-indigo-500 hover:bg-indigo-400';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#1e293b', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
        <div className="p-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-red-500/10' : 'bg-indigo-500/10'}`}>
            {type === 'danger' ? (
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
          <p className="text-sm text-slate-400 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 transition-all hover:bg-slate-600/50"
              style={{ border: '1px solid rgba(100, 116, 139, 0.3)' }}
            >
              {cancelText || 'Cancelar'}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${buttonColor}`}
            >
              {confirmText || 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tarjeta de consejo para panel de ayuda
const TipCard = ({ icon, title, text }) => (
  <div className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
    <div className="flex items-start gap-3">
      <span className="text-lg">{icon}</span>
      <div>
        <h4 className="text-sm font-medium text-slate-200">{title}</h4>
        <p className="text-xs text-slate-400 mt-0.5">{text}</p>
      </div>
    </div>
  </div>
);

export default function FlowEditor() {
  const { workspaceId, workspaceName } = useWorkspace();
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [tables, setTables] = useState([]);
  const [flowTemplates, setFlowTemplates] = useState([]);
  const [flowName, setFlowName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  
  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  
  // Estado para modo de prueba
  const [testMode, setTestMode] = useState(false);
  const [testMessages, setTestMessages] = useState([]);
  const [testInput, setTestInput] = useState('');
  const [testStep, setTestStep] = useState(0);
  const [highlightedNode, setHighlightedNode] = useState(null);
  
  // Estado para edición de nodos
  const [selectedNode, setSelectedNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // Estado de React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Historial para Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Guardar estado en historial
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    // Limitar historial a 50 estados
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, history, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Solo en el editor de flujos
      if (!selectedFlow) return;
      
      // Ctrl+S o Cmd+S para guardar
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFlow();
      }
      
      // Ctrl+Z o Cmd+Z para deshacer
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      
      // Ctrl+Shift+Z o Ctrl+Y para rehacer
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      
      // Delete o Backspace para eliminar nodo seleccionado
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        handleDeleteNode(selectedNode.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFlow, selectedNode, handleUndo, handleRedo]);

  // Cargar plantillas de flujos (globales, no dependen del workspace)
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await api.get('/flow/templates');
        setFlowTemplates(res.data?.templates || res.data || []);
      } catch (err) {
        console.error('Error loading flow templates:', err);
        // Fallback: plantilla vacía
        setFlowTemplates([{
          _id: 'empty',
          name: 'Flujo vacío',
          description: 'Empieza desde cero',
          icon: '✨',
          color: 'zinc',
          nodes: [],
          edges: [],
        }]);
      }
    };
    loadTemplates();
  }, []);

  // Cargar flujos y tablas
  useEffect(() => {
    if (!workspaceId) return;
    
    setLoading(true);
    const loadData = async () => {
      try {
        const [flowsRes, tablesRes] = await Promise.all([
          api.get('/flow/list', { params: { workspaceId } }),
          api.get('/table/list', { params: { workspaceId } }),
        ]);
        setFlows(flowsRes.data || []);
        setTables(tablesRes.data || []);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [workspaceId]);

  // Actualizar nodos cuando cambian las tablas
  useEffect(() => {
    if (tables.length > 0 && nodes.length > 0) {
      setNodes(currentNodes => 
        currentNodes.map(node => ({
          ...node,
          data: { ...node.data, tables }
        }))
      );
    }
  }, [tables]);

  // Conectar nodos
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', color: '#10b981' }
    }, eds)),
    [setEdges]
  );

  // Arrastrar nodo desde panel lateral
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 110,
        y: event.clientY - reactFlowBounds.top - 50,
      };

      const blockInfo = availableBlocks.find(b => b.type === type);
      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { 
          label: blockInfo?.label || type,
          tables,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, tables]
  );

  // Crear nuevo flujo (con o sin plantilla)
  const handleCreateFlow = async (template = null) => {
    console.log('handleCreateFlow called, workspaceId:', workspaceId);
    
    if (!workspaceId) {
      setCreateError('No hay workspace seleccionado. Ve a Workspaces y selecciona uno.');
      return;
    }
    
    setIsCreating(true);
    setCreateError(null);
    
    try {
      const flowData = {
        workspaceId,
        name: template?.name || 'Mi nuevo flujo',
        description: template?.description || '',
        nodes: template?.nodes || [],
        edges: template?.edges || [],
      };
      
      console.log('Creating flow with data:', flowData);
      
      const res = await api.post('/flow/create', flowData);
      console.log('Flow created:', res.data);
      
      // Enriquecer nodos con tablas
      const nodesWithTables = (res.data.nodes || template?.nodes || []).map(n => ({
        ...n,
        data: { ...n.data, tables }
      }));
      
      // Normalizar sourceHandle: yes/no → true/false
      const edgesToUse = res.data.edges || template?.edges || [];
      const normalizedEdges = edgesToUse.map(edge => ({
        ...edge,
        sourceHandle: edge.sourceHandle === 'yes' ? 'true' : edge.sourceHandle === 'no' ? 'false' : edge.sourceHandle
      }));
      
      setFlows([...flows, res.data]);
      setSelectedFlow(res.data);
      setFlowName(res.data.name);
      setNodes(nodesWithTables);
      setEdges(normalizedEdges);
      setShowTemplates(false);
      addToast(`Flujo "${res.data.name}" creado correctamente`, 'success');
    } catch (err) {
      console.error('Error creating flow:', err);
      console.error('Error response:', err.response?.data);
      setCreateError(err.response?.data?.error || err.message || 'Error al crear el flujo');
      addToast('Error al crear el flujo', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Seleccionar flujo existente
  const handleSelectFlow = (flow) => {
    setSelectedFlow(flow);
    setFlowName(flow.name);
    
    // Crear un mapa de ID -> Nombre de tabla
    const tableIdToName = {};
    tables.forEach(t => {
      tableIdToName[t._id] = t.name;
    });
    
    // Enriquecer los nodos con nombres de tabla
    const nodesWithTableNames = (flow.nodes || []).map(node => {
      const enrichedData = { ...node.data, tables };
      
      // Resolver nombre de tabla destino
      if (node.data?.targetTable) {
        enrichedData.targetTableName = tableIdToName[node.data.targetTable] || node.data.targetTable;
      }
      
      // Resolver nombre de tabla en trigger
      if (node.data?.table) {
        enrichedData.tableName = tableIdToName[node.data.table] || node.data.table;
      }
      
      // Si es un trigger, usar triggerTable del flujo
      if (node.type === 'trigger' && flow.triggerTable) {
        enrichedData.tableName = tableIdToName[flow.triggerTable] || flow.triggerTable;
      }
      
      return {
        ...node,
        data: enrichedData
      };
    });
    
    // Normalizar sourceHandle: yes/no → true/false para compatibilidad
    const normalizedEdges = (flow.edges || []).map(edge => ({
      ...edge,
      sourceHandle: edge.sourceHandle === 'yes' ? 'true' : edge.sourceHandle === 'no' ? 'false' : edge.sourceHandle
    }));
    
    setNodes(nodesWithTableNames);
    setEdges(normalizedEdges);
  };

  // Guardar flujo
  const handleSaveFlow = async () => {
    if (!selectedFlow || !workspaceId) return;
    
    setIsSaving(true);
    try {
      const cleanNodes = nodes.map(node => ({
        ...node,
        data: { ...node.data, tables: undefined }
      }));

      await api.put('/flow/update', {
        workspaceId,
        flowId: selectedFlow._id,
        name: flowName,
        nodes: cleanNodes,
        edges,
      });
      
      setFlows(flows.map(f => 
        f._id === selectedFlow._id 
          ? { ...f, name: flowName, nodes, edges }
          : f
      ));
      
      addToast('Flujo guardado correctamente', 'success');
    } catch (err) {
      console.error('Error saving flow:', err);
      addToast('Error al guardar el flujo', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar flujo
  const handleDeleteFlow = async () => {
    if (!selectedFlow || !workspaceId) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar flujo',
      message: `¿Estás seguro de eliminar "${selectedFlow.name}"? Esta acción eliminará permanentemente el flujo y no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await api.delete('/flow/delete', {
            data: { workspaceId, flowId: selectedFlow._id }
          });
          
          setFlows(flows.filter(f => f._id !== selectedFlow._id));
          setSelectedFlow(null);
          setNodes([]);
          setEdges([]);
          addToast('Flujo eliminado correctamente', 'success');
        } catch (err) {
          console.error('Error deleting flow:', err);
          addToast('Error al eliminar el flujo', 'error');
        }
        setConfirmModal({ isOpen: false });
      }
    });
  };

  // Clic en nodo para editar
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setContextMenu(null);
  }, []);

  // Clic derecho en nodo
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      nodeName: node.data?.label || node.type
    });
  }, []);

  // Clic en canvas para cerrar menú
  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setSelectedNode(null);
  }, []);

  // Eliminar nodo
  const handleDeleteNode = useCallback((nodeId) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setContextMenu(null);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  // Actualizar datos del nodo seleccionado
  const updateSelectedNodeData = useCallback((key, value) => {
    if (!selectedNode) return;
    
    setNodes(nds => nds.map(node => {
      if (node.id === selectedNode.id) {
        const updatedNode = {
          ...node,
          data: { ...node.data, [key]: value }
        };
        setSelectedNode(updatedNode);
        return updatedNode;
      }
      return node;
    }));
  }, [selectedNode, setNodes]);

  // Obtener variables disponibles de los nodos anteriores
  const getAvailableVariables = useCallback(() => {
    const variables = [
      { name: 'recordData', description: 'Datos del registro que disparó el flujo' },
    ];
    
    // Buscar nodos de tipo query que definen variables
    nodes.forEach(node => {
      if (node.type === 'query' && node.data?.outputVar) {
        const tableName = node.data?.targetTableName || 'datos';
        variables.push({
          name: node.data.outputVar,
          description: `Datos de ${tableName}`
        });
      }
    });
    
    return variables;
  }, [nodes]);

  // Obtener campos disponibles de una tabla
  const getTableFields = useCallback((tableId) => {
    const table = tables.find(t => t._id === tableId);
    if (!table || !table.headers) return [];
    return table.headers.map(h => ({
      name: h.key,
      label: h.label || h.key,
      type: h.type
    }));
  }, [tables]);

  // Sin workspace
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#0f172a' }}>
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 text-amber-400 bg-amber-500/15">
            {Icons.flow}
          </div>
          <h1 className="text-xl font-semibold text-slate-100 mb-2">Editor de Flujos</h1>
          <p className="text-slate-400 mb-6 max-w-sm">
            Selecciona un workspace para crear automatizaciones
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
      <div className="flex items-center justify-center h-full" style={{ background: '#0a0a0f' }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 animate-pulse" />
            <div className="absolute inset-0 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-slate-400">Cargando flujos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)] flex" style={{ background: '#0a0a0f' }} data-tour="flow-welcome">
      {/* Sidebar izquierdo - Lista de flujos */}
      <aside 
        className="w-64 flex flex-col backdrop-blur-xl" 
        style={{ 
          background: 'linear-gradient(180deg, rgba(20, 20, 30, 0.95), rgba(10, 10, 15, 0.98))',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)'
        }}
        data-tour="flow-templates"
      >
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 blur-lg opacity-50" />
              <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br from-amber-500 to-orange-600">
                {Icons.flow}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Flujos</h2>
              <p className="text-xs text-slate-500 truncate max-w-[140px]">{workspaceName}</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowTemplates(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {Icons.plus}
            Nuevo flujo
          </button>
        </div>

        {/* Lista de flujos */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {flows.length === 0 ? (
            <div className="text-center py-8">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-500" 
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                {Icons.folder}
              </div>
              <p className="text-sm text-slate-300 mb-1">Sin flujos</p>
              <p className="text-xs text-slate-500">Crea tu primer flujo</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {flows.map(flow => (
                <button
                  key={flow._id}
                  onClick={() => handleSelectFlow(flow)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 group ${
                    selectedFlow?._id === flow._id
                      ? 'text-amber-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  style={{ 
                    background: selectedFlow?._id === flow._id 
                      ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))' 
                      : 'transparent',
                    border: selectedFlow?._id === flow._id 
                      ? '1px solid rgba(245, 158, 11, 0.2)' 
                      : '1px solid transparent'
                  }}
                >
                  <div 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 transition-all duration-300 ${
                      selectedFlow?._id === flow._id 
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30' 
                        : 'bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300'
                    }`}
                  >
                    <BoltIcon size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{flow.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {flow.nodes?.length || 0} bloques
                    </p>
                  </div>
                  {selectedFlow?._id === flow._id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ayuda */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button
            onClick={() => setShowHelp(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 text-sm hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-300"
            style={{ border: '1px solid rgba(255, 255, 255, 0.04)' }}
          >
            {Icons.help}
            ¿Cómo funciona?
          </button>
        </div>
      </aside>

      {/* Área principal - Canvas */}
      <main className="flex-1 flex flex-col" style={{ background: '#0a0a0f' }}>
        {selectedFlow ? (
          <>
            {/* Toolbar */}
            <div 
              className="h-14 flex items-center gap-3 px-4 backdrop-blur-xl" 
              style={{ 
                background: 'linear-gradient(90deg, rgba(20, 20, 30, 0.9), rgba(15, 15, 25, 0.95))',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="flex-1 max-w-xs px-4 py-2 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                placeholder="Nombre del flujo"
              />
              
              {/* Undo/Redo buttons */}
              <div 
                className="flex items-center gap-1 px-3 py-1 rounded-lg" 
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <button 
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Deshacer (Ctrl+Z)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Rehacer (Ctrl+Y)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-xs text-slate-500 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                  {nodes.length} bloques · {edges.length} conexiones
                </span>
                <button 
                  onClick={() => {
                    setTestMode(true);
                    setTestMessages([{
                      type: 'system',
                      text: '🧪 Modo de prueba activado. Simula una conversación para ver cómo funciona tu flujo.',
                    }]);
                    setTestStep(0);
                    setHighlightedNode(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-violet-300 text-sm font-medium hover:shadow-lg hover:shadow-violet-500/20 transition-all"
                  style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)' }}
                  title="Probar flujo"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  Probar
                </button>
                <button 
                  onClick={handleSaveFlow} 
                  disabled={isSaving}
                  data-tour="flow-save"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 transition-all"
                  title="Guardar (Ctrl+S)"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    Icons.save
                  )}
                  {isSaving ? 'Guardando...' : 'Guardar'}
                  <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] rounded bg-white/20 text-emerald-100">⌘S</kbd>
                </button>
                <button 
                  onClick={handleDeleteFlow}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.04)' }}
                  title="Eliminar flujo"
                >
                  {Icons.trash}
                </button>
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className={`p-2.5 rounded-xl transition-all ${showHelp ? 'text-amber-400 bg-amber-500/15' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'}`}
                  style={{ border: '1px solid rgba(255, 255, 255, 0.04)' }}
                  title="Ayuda y consejos"
                >
                  {Icons.help}
                </button>
              </div>
            </div>

            {/* Panel de ayuda contextual */}
            {showHelp && (
              <div 
                className="absolute top-20 right-4 w-80 rounded-2xl overflow-hidden shadow-2xl z-50 animate-fade-up"
                style={{ background: 'linear-gradient(to bottom, #1e293b, #0f172a)', border: '1px solid rgba(251, 191, 36, 0.2)' }}
              >
                <div className="px-4 py-3 flex items-center justify-between border-b border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100">Consejos</h3>
                  </div>
                  <button onClick={() => setShowHelp(false)} className="p-1 text-slate-400 hover:text-white">{Icons.close}</button>
                </div>
                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                  {nodes.length === 0 ? (
                    <>
                      <TipCard icon="🎯" title="Empieza con un Trigger" text="Arrastra un bloque 'Inicio' desde el panel derecho para definir qué inicia tu flujo." />
                      <TipCard icon="💡" title="Usa plantillas" text="Haz clic en 'Plantillas' para usar flujos predefinidos y ahorrarte tiempo." />
                    </>
                  ) : nodes.length === 1 ? (
                    <>
                      <TipCard icon="🔗" title="Conecta bloques" text="Ahora arrastra otro bloque y conéctalo haciendo clic y arrastrando desde el punto de conexión." />
                      <TipCard icon="⚡" title="Define acciones" text="Usa bloques de 'Acción' para guardar datos, enviar mensajes o notificaciones." />
                    </>
                  ) : edges.length === 0 ? (
                    <>
                      <TipCard icon="🔗" title="¡Conecta tus bloques!" text="Haz clic en un punto de salida (abajo del bloque) y arrastra hasta el punto de entrada de otro bloque." />
                    </>
                  ) : (
                    <>
                      <TipCard icon="✅" title="¡Bien hecho!" text="Tu flujo está tomando forma. Usa el modo 'Probar' para simular cómo funcionará." />
                      <TipCard icon="💾" title="Guarda tu trabajo" text="No olvides guardar con Ctrl+S o el botón 'Guardar' para no perder tus cambios." />
                      <TipCard icon="🔄" title="Undo/Redo" text="Si te equivocas, usa Ctrl+Z para deshacer o Ctrl+Y para rehacer." />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Canvas */}
            <div className="flex-1 relative" data-tour="flow-canvas">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
                minZoom={0.3}
                maxZoom={2}
                defaultViewport={{ x: 100, y: 100, zoom: 0.9 }}
                defaultEdgeOptions={{
                  animated: true,
                  style: { stroke: '#10b981', strokeWidth: 2 },
                }}
                style={{ background: '#0a0a0f' }}
              >
                <Controls 
                  className="!rounded-xl !shadow-xl"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.95), rgba(20, 20, 30, 0.98))', 
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(10px)'
                  }}
                />
                <MiniMap 
                  className="!rounded-xl !shadow-xl"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.95), rgba(20, 20, 30, 0.98))', 
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(10px)'
                  }}
                  maskColor="rgba(0, 0, 0, 0.8)"
                  nodeColor={(node) => {
                    const block = availableBlocks.find(b => b.type === node.type);
                    return block?.color || '#3b82f6';
                  }}
                />
                <Background 
                  variant="dots" 
                  gap={25} 
                  size={1} 
                  color="rgba(255,255,255,0.04)" 
                  style={{ background: '#0a0a0f' }}
                />

                {/* Instrucciones si está vacío */}
                {nodes.length === 0 && (
                  <Panel position="top-center">
                    <div 
                      className="px-8 py-6 rounded-2xl text-center mt-20 backdrop-blur-xl shadow-2xl"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.9), rgba(20, 20, 30, 0.95))', 
                        border: '1px solid rgba(255, 255, 255, 0.1)' 
                      }}
                    >
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                      <p className="text-white font-semibold mb-1 text-lg">¡Empieza a crear!</p>
                      <p className="text-sm text-slate-400">
                        Arrastra bloques desde el panel derecho →
                      </p>
                    </div>
                  </Panel>
                )}
              </ReactFlow>

              {/* Menú contextual (clic derecho) */}
              {contextMenu && (
                <div 
                  className="fixed z-50 rounded-xl overflow-hidden shadow-2xl"
                  style={{ 
                    left: contextMenu.x, 
                    top: contextMenu.y,
                    background: '#1e293b',
                    border: '1px solid rgba(100, 116, 139, 0.3)'
                  }}
                >
                  <div className="px-3 py-2 text-xs text-slate-400" style={{ borderBottom: '1px solid rgba(100, 116, 139, 0.3)' }}>
                    {contextMenu.nodeName}
                  </div>
                  <button
                    onClick={() => {
                      const node = nodes.find(n => n.id === contextMenu.nodeId);
                      if (node) setSelectedNode(node);
                      setContextMenu(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-100 hover:bg-amber-500/20 flex items-center gap-2"
                  >
                    <EditIcon size="sm" /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteNode(contextMenu.nodeId)}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                  >
                    <TrashIcon size="sm" /> Eliminar
                  </button>
                </div>
              )}

              {/* Panel de prueba del flujo */}
              {testMode && (
                <div 
                  className="absolute right-4 bottom-4 w-96 max-h-[500px] rounded-2xl overflow-hidden shadow-2xl z-40 flex flex-col border border-violet-500/30"
                  style={{ background: 'linear-gradient(to bottom, #1e293b, #0f172a)' }}
                >
                  {/* Header */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-violet-500/20 bg-violet-500/5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">Modo de prueba</h3>
                        <p className="text-xs text-violet-400">Simula una conversación</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setTestMode(false);
                        setTestMessages([]);
                        setHighlightedNode(null);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 transition-all"
                    >
                      {Icons.close}
                    </button>
                  </div>
                  
                  {/* Messages area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
                    {testMessages.map((msg, i) => (
                      <div 
                        key={i} 
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                          msg.type === 'user' 
                            ? 'bg-violet-500 text-white' 
                            : msg.type === 'system'
                              ? 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                              : msg.type === 'node'
                                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                                : 'bg-slate-700/50 text-slate-100'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Sample messages */}
                  <div className="px-4 py-2 border-t border-white/5">
                    <div className="text-xs text-slate-500 mb-2">Mensajes de ejemplo:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Hola', 'Quiero reservar', 'Mesa para 4 personas', 'Consultar disponibilidad'].map((msg) => (
                        <button
                          key={msg}
                          onClick={() => {
                            setTestMessages(prev => [...prev, { type: 'user', text: msg }]);
                            // Simular respuesta del flujo
                            setTimeout(() => {
                              // Encontrar el nodo trigger o el primero
                              const triggerNode = nodes.find(n => n.type === 'trigger') || nodes[0];
                              if (triggerNode) {
                                setHighlightedNode(triggerNode.id);
                                setTestMessages(prev => [...prev, { 
                                  type: 'node', 
                                  text: `📍 Ejecutando: ${triggerNode.data?.label || triggerNode.type}`
                                }]);
                              }
                              setTimeout(() => {
                                setTestMessages(prev => [...prev, { 
                                  type: 'bot', 
                                  text: 'Perfecto, te ayudo con eso. ¿Para qué fecha te gustaría?' 
                                }]);
                                setHighlightedNode(null);
                              }, 800);
                            }, 500);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-700/50 text-xs text-slate-400 hover:bg-violet-500/20 hover:text-violet-300 transition-colors"
                        >
                          {msg}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Input area */}
                  <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(100, 116, 139, 0.3)', background: 'rgba(15, 23, 42, 0.2)' }}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && testInput.trim()) {
                            setTestMessages(prev => [...prev, { type: 'user', text: testInput }]);
                            setTestInput('');
                            // Simular respuesta
                            setTimeout(() => {
                              const nextNode = nodes.find(n => n.type === 'response') || nodes[Math.floor(Math.random() * nodes.length)];
                              if (nextNode) {
                                setHighlightedNode(nextNode.id);
                                setTestMessages(prev => [...prev, { 
                                  type: 'node', 
                                  text: `📍 Ejecutando: ${nextNode.data?.label || nextNode.type}`
                                }]);
                              }
                              setTimeout(() => {
                                setTestMessages(prev => [...prev, { 
                                  type: 'bot', 
                                  text: 'Entendido. Procesando tu solicitud...' 
                                }]);
                                setHighlightedNode(null);
                              }, 600);
                            }, 400);
                          }
                        }}
                        placeholder="Escribe un mensaje de prueba..."
                        className="flex-1 px-3 py-2 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                        style={{ background: 'rgba(71, 85, 105, 0.4)', border: '1px solid rgba(100, 116, 139, 0.3)' }}
                      />
                      <button 
                        onClick={() => {
                          if (testInput.trim()) {
                            setTestMessages(prev => [...prev, { type: 'user', text: testInput }]);
                            setTestInput('');
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-violet-500 text-white hover:bg-violet-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Simulación local del flujo</span>
                      <button
                        onClick={() => {
                          setTestMessages([{
                            type: 'system',
                            text: '🔄 Conversación reiniciada',
                          }]);
                          setHighlightedNode(null);
                        }}
                        className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
                      >
                        Reiniciar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Panel de edición de nodo */}
              {selectedNode && (
                <div 
                  className="absolute right-4 top-4 w-80 rounded-xl overflow-hidden shadow-2xl z-40"
                  style={{ background: '#1e293b', border: '1px solid rgba(100, 116, 139, 0.3)' }}
                >
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(30, 41, 59, 0.8)', borderBottom: '1px solid rgba(100, 116, 139, 0.3)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {availableBlocks.find(b => b.type === selectedNode.type)?.icon || <BoltIcon size="md" />}
                      </span>
                      <span className="text-sm font-medium text-slate-100">
                        Editar {availableBlocks.find(b => b.type === selectedNode.type)?.label || 'Nodo'}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 transition-all"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Etiqueta */}
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5">Etiqueta</label>
                      <input
                        type="text"
                        value={selectedNode.data?.label || ''}
                        onChange={(e) => updateSelectedNodeData('label', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                        placeholder="Nombre descriptivo"
                      />
                    </div>

                    {/* Campos específicos por tipo de nodo */}
                    {selectedNode.type === 'trigger' && (
                      <>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1.5">Evento</label>
                          <select
                            value={selectedNode.data?.triggerType || ''}
                            onChange={(e) => updateSelectedNodeData('triggerType', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <option value="">Seleccionar evento...</option>
                            <option value="create">Cuando se crea un registro</option>
                            <option value="update">Cuando se actualiza</option>
                            <option value="delete">Cuando se elimina</option>
                            <option value="message">Cuando llega un mensaje</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1.5">Tabla</label>
                          <select
                            value={selectedNode.data?.table || ''}
                            onChange={(e) => {
                              const tableId = e.target.value;
                              const tableName = tables.find(t => t._id === tableId)?.name || '';
                              updateSelectedNodeData('table', tableId);
                              updateSelectedNodeData('tableName', tableName);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <option value="">Seleccionar tabla...</option>
                            {tables.map(t => (
                              <option key={t._id} value={t._id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {selectedNode.type === 'query' && (
                      <>
                        {/* Paso 1: Seleccionar tabla donde buscar */}
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1.5 font-medium flex items-center gap-1"><ClipboardIcon size="xs" /> Buscar en tabla</label>
                          <select
                            value={selectedNode.data?.targetTable || ''}
                            onChange={(e) => {
                              const tableId = e.target.value;
                              const table = tables.find(t => t._id === tableId);
                              const tableName = table?.name || '';
                              const autoVarName = tableName 
                                ? tableName.toLowerCase().replace(/s$/, '') + 'Data'
                                : '';
                              updateSelectedNodeData('targetTable', tableId);
                              updateSelectedNodeData('targetTableName', tableName);
                              updateSelectedNodeData('outputVar', autoVarName);
                              updateSelectedNodeData('filterField', '');
                              updateSelectedNodeData('filterValueType', 'trigger');
                              updateSelectedNodeData('filterValueField', '');
                              updateSelectedNodeData('filterValueFixed', '');
                            }}
                            className="w-full px-3 py-2.5 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <option value="">Seleccionar tabla...</option>
                            {tables.map(t => (
                              <option key={t._id} value={t._id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Paso 2: Filtro simple */}
                        {selectedNode.data?.targetTable && (
                          <div className="p-3 rounded-lg space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <label className="block text-xs text-zinc-400 font-medium flex items-center gap-1"><SearchIcon size="xs" /> Buscar donde</label>
                            
                            {/* Campo de la tabla a buscar */}
                            <div>
                              <span className="text-[10px] text-zinc-500 mb-1 block">Campo de {selectedNode.data?.targetTableName}:</span>
                              <select
                                value={selectedNode.data?.filterField || ''}
                                onChange={(e) => updateSelectedNodeData('filterField', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg text-white text-sm cursor-pointer"
                                style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                              >
                                <option value="">Seleccionar campo...</option>
                                {getTableFields(selectedNode.data.targetTable).map(f => (
                                  <option key={f.name} value={f.name}>{f.label}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Signo igual */}
                            <div className="text-center">
                              <span className="text-amber-400 font-bold text-lg">=</span>
                            </div>
                            
                            {/* Valor: de dónde viene */}
                            <div>
                              <span className="text-[10px] text-zinc-500 mb-1 block">Valor a comparar:</span>
                              <div className="space-y-2">
                                {/* Opción 1: Del registro que disparó */}
                                <label className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                                  selectedNode.data?.filterValueType === 'trigger' ? 'ring-2 ring-amber-500' : ''
                                }`} style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  <input
                                    type="radio"
                                    name="valueType"
                                    checked={selectedNode.data?.filterValueType === 'trigger'}
                                    onChange={() => updateSelectedNodeData('filterValueType', 'trigger')}
                                    className="text-amber-500"
                                  />
                                  <div className="flex-1">
                                    <span className="text-xs text-white">Del registro que activó el flujo</span>
                                    {selectedNode.data?.filterValueType === 'trigger' && (
                                      <select
                                        value={selectedNode.data?.filterValueField || ''}
                                        onChange={(e) => updateSelectedNodeData('filterValueField', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full mt-2 px-2 py-1.5 rounded text-amber-300 text-xs cursor-pointer"
                                        style={{ background: '#1a1a1f', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
                                      >
                                        <option value="" style={{ background: '#1a1a1f', color: '#a1a1aa' }}>Elegir campo...</option>
                                        {/* Campos del trigger (si hay tabla trigger seleccionada) */}
                                        {nodes.find(n => n.type === 'trigger')?.data?.table && 
                                          getTableFields(nodes.find(n => n.type === 'trigger').data.table).map(f => (
                                            <option key={f.name} value={f.name} style={{ background: '#1a1a1f', color: '#fbbf24' }}>{f.label}</option>
                                          ))
                                        }
                                        {/* Si no hay trigger, mostrar campos genéricos */}
                                        {!nodes.find(n => n.type === 'trigger')?.data?.table && (
                                          <>
                                            <option value="nombre" style={{ background: '#1a1a1f', color: '#fbbf24' }}>Nombre</option>
                                            <option value="producto" style={{ background: '#1a1a1f', color: '#fbbf24' }}>Producto</option>
                                            <option value="cliente" style={{ background: '#1a1a1f', color: '#fbbf24' }}>Cliente</option>
                                            <option value="total" style={{ background: '#1a1a1f', color: '#fbbf24' }}>Total</option>
                                            <option value="cantidad" style={{ background: '#1a1a1f', color: '#fbbf24' }}>Cantidad</option>
                                          </>
                                        )}
                                      </select>
                                    )}
                                  </div>
                                </label>
                                
                                {/* Opción 2: Valor fijo */}
                                <label className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                                  selectedNode.data?.filterValueType === 'fixed' ? 'ring-2 ring-amber-500' : ''
                                }`} style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  <input
                                    type="radio"
                                    name="valueType"
                                    checked={selectedNode.data?.filterValueType === 'fixed'}
                                    onChange={() => updateSelectedNodeData('filterValueType', 'fixed')}
                                    className="text-amber-500"
                                  />
                                  <div className="flex-1">
                                    <span className="text-xs text-white">Valor específico</span>
                                    {selectedNode.data?.filterValueType === 'fixed' && (
                                      <input
                                        type="text"
                                        value={selectedNode.data?.filterValueFixed || ''}
                                        onChange={(e) => updateSelectedNodeData('filterValueFixed', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full mt-2 px-2 py-1.5 rounded text-white text-xs"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                        placeholder="Escribir valor..."
                                      />
                                    )}
                                  </div>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Resultado */}
                        {selectedNode.data?.targetTable && (
                          <div className="space-y-2">
                            <label className="block text-xs text-zinc-400 font-medium">📤 Resultado</label>
                            <div className="flex gap-2">
                              <div className="flex-1 p-2 rounded-lg text-center" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                <span className="text-xs text-emerald-400">✓ Sí encuentra</span>
                              </div>
                              <div className="flex-1 p-2 rounded-lg text-center" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                <span className="text-xs text-red-400">✗ No encuentra</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-zinc-500">
                              Conecta cada salida a la acción correspondiente
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {selectedNode.type === 'condition' && (
                      <>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1.5">Campo a evaluar</label>
                          <select
                            value={selectedNode.data?.field || ''}
                            onChange={(e) => updateSelectedNodeData('field', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <option value="">Seleccionar campo...</option>
                            <optgroup label="Registro que disparó el flujo">
                              <option value="recordData.cantidad">Cantidad</option>
                              <option value="recordData.total">Total</option>
                              <option value="recordData.estado">Estado</option>
                            </optgroup>
                            {getAvailableVariables().filter(v => v.name !== 'recordData').map(variable => (
                              <optgroup key={variable.name} label={`${variable.description}`}>
                                <option value={`${variable.name}.stock`}>Stock</option>
                                <option value={`${variable.name}.precio`}>Precio</option>
                                <option value={`${variable.name}.nombre`}>Nombre</option>
                                <option value={`${variable.name}.cantidad`}>Cantidad</option>
                                <option value={`${variable.name}.total`}>Total</option>
                              </optgroup>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={selectedNode.data?.field || ''}
                            onChange={(e) => updateSelectedNodeData('field', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-white text-xs mt-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                            placeholder="O escribe manualmente: variable.campo"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1.5">Operador</label>
                          <select
                            value={selectedNode.data?.operator || ''}
                            onChange={(e) => updateSelectedNodeData('operator', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <option value="">Seleccionar...</option>
                            <option value="==">es igual a</option>
                            <option value="!=">es diferente de</option>
                            <option value=">">es mayor que</option>
                            <option value="<">es menor que</option>
                            <option value=">=">es mayor o igual a</option>
                            <option value="<=">es menor o igual a</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1.5">Valor</label>
                          <input
                            type="text"
                            value={selectedNode.data?.value || ''}
                            onChange={(e) => updateSelectedNodeData('value', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                            placeholder="Ej: 0"
                          />
                        </div>
                      </>
                    )}

                    {selectedNode.type === 'action' && (
                      <>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1.5">Tipo de acción</label>
                          <select
                            value={selectedNode.data?.actionType || ''}
                            onChange={(e) => {
                              updateSelectedNodeData('actionType', e.target.value);
                              updateSelectedNodeData('filter', {});
                              updateSelectedNodeData('fields', {});
                            }}
                            className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <option value="">Seleccionar...</option>
                            <option value="create">Crear registro</option>
                            <option value="update">Actualizar registro</option>
                            <option value="notification">Enviar notificación</option>
                            <option value="decrement">Restar cantidad</option>
                            <option value="increment">Sumar cantidad</option>
                          </select>
                        </div>
                        
                        {selectedNode.data?.actionType && selectedNode.data.actionType !== 'notification' && (
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Tabla destino</label>
                            <select
                              value={selectedNode.data?.targetTable || ''}
                              onChange={(e) => {
                                const tableId = e.target.value;
                                const tableName = tables.find(t => t._id === tableId)?.name || '';
                                updateSelectedNodeData('targetTable', tableId);
                                updateSelectedNodeData('targetTableName', tableName);
                                updateSelectedNodeData('filter', {});
                                updateSelectedNodeData('fields', {});
                              }}
                              className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                              style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                              <option value="">Seleccionar tabla...</option>
                              {tables.map(t => (
                                <option key={t._id} value={t._id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        {/* Filtros para update/decrement/increment */}
                        {selectedNode.data?.targetTable && ['update', 'decrement', 'increment'].includes(selectedNode.data?.actionType) && (
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Buscar registro donde...</label>
                            <div className="space-y-2">
                              {Object.entries(selectedNode.data?.filter || {}).map(([field, value], idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <select
                                    value={field}
                                    onChange={(e) => {
                                      const newFilter = { ...selectedNode.data?.filter };
                                      delete newFilter[field];
                                      if (e.target.value) {
                                        newFilter[e.target.value] = value;
                                      }
                                      updateSelectedNodeData('filter', newFilter);
                                    }}
                                    className="flex-1 px-2 py-1.5 rounded text-white text-xs"
                                    style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                                  >
                                    <option value="">Campo...</option>
                                    {getTableFields(selectedNode.data.targetTable)
                                      .filter(f => f.name === field || !Object.keys(selectedNode.data?.filter || {}).includes(f.name))
                                      .map(f => (
                                        <option key={f.name} value={f.name}>{f.label}</option>
                                      ))}
                                  </select>
                                  <span className="text-zinc-600 text-xs">=</span>
                                  <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => {
                                      const newFilter = { ...selectedNode.data?.filter, [field]: e.target.value };
                                      updateSelectedNodeData('filter', newFilter);
                                    }}
                                    className="flex-1 px-2 py-1.5 rounded text-white text-xs"
                                    style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                                    placeholder="{{variable}}"
                                  />
                                  <button
                                    onClick={() => {
                                      const newFilter = { ...selectedNode.data?.filter };
                                      delete newFilter[field];
                                      updateSelectedNodeData('filter', newFilter);
                                    }}
                                    className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              
                              {getTableFields(selectedNode.data.targetTable).length > Object.keys(selectedNode.data?.filter || {}).length && (
                                <button
                                  onClick={() => {
                                    const usedFields = Object.keys(selectedNode.data?.filter || {});
                                    const availableField = getTableFields(selectedNode.data.targetTable)
                                      .find(f => !usedFields.includes(f.name));
                                    if (availableField) {
                                      const newFilter = { ...selectedNode.data?.filter, [availableField.name]: '' };
                                      updateSelectedNodeData('filter', newFilter);
                                    }
                                  }}
                                  className="w-full px-3 py-2 rounded-lg text-xs text-amber-400 hover:bg-amber-500/10 flex items-center justify-center gap-1"
                                  style={{ border: '1px dashed rgba(245, 158, 11, 0.3)' }}
                                >
                                  + Agregar filtro
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Campos a modificar */}
                        {selectedNode.data?.targetTable && ['create', 'update', 'decrement', 'increment'].includes(selectedNode.data?.actionType) && (
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">
                              {selectedNode.data.actionType === 'create' ? 'Valores a crear' : 
                               selectedNode.data.actionType === 'decrement' ? 'Campo a restar' :
                               selectedNode.data.actionType === 'increment' ? 'Campo a sumar' : 'Valores a cambiar'}
                            </label>
                            <div className="space-y-2">
                              {Object.entries(selectedNode.data?.fields || {}).map(([field, value], idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <select
                                    value={field}
                                    onChange={(e) => {
                                      const newFields = { ...selectedNode.data?.fields };
                                      delete newFields[field];
                                      if (e.target.value) {
                                        newFields[e.target.value] = value;
                                      }
                                      updateSelectedNodeData('fields', newFields);
                                    }}
                                    className="flex-1 px-2 py-1.5 rounded text-white text-xs"
                                    style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                                  >
                                    <option value="">Campo...</option>
                                    {getTableFields(selectedNode.data.targetTable)
                                      .filter(f => f.name === field || !Object.keys(selectedNode.data?.fields || {}).includes(f.name))
                                      .map(f => (
                                        <option key={f.name} value={f.name}>{f.label}</option>
                                      ))}
                                  </select>
                                  <span className="text-zinc-600 text-xs">→</span>
                                  <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => {
                                      const newFields = { ...selectedNode.data?.fields, [field]: e.target.value };
                                      updateSelectedNodeData('fields', newFields);
                                    }}
                                    className="flex-1 px-2 py-1.5 rounded text-white text-xs"
                                    style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                                    placeholder="{{variable}} o valor"
                                  />
                                  <button
                                    onClick={() => {
                                      const newFields = { ...selectedNode.data?.fields };
                                      delete newFields[field];
                                      updateSelectedNodeData('fields', newFields);
                                    }}
                                    className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              
                              {getTableFields(selectedNode.data.targetTable).length > Object.keys(selectedNode.data?.fields || {}).length && (
                                <button
                                  onClick={() => {
                                    const usedFields = Object.keys(selectedNode.data?.fields || {});
                                    const availableField = getTableFields(selectedNode.data.targetTable)
                                      .find(f => !usedFields.includes(f.name));
                                    if (availableField) {
                                      const newFields = { ...selectedNode.data?.fields, [availableField.name]: '' };
                                      updateSelectedNodeData('fields', newFields);
                                    }
                                  }}
                                  className="w-full px-3 py-2 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center gap-1"
                                  style={{ border: '1px dashed rgba(16, 185, 129, 0.3)' }}
                                >
                                  + Agregar campo
                                </button>
                              )}
                            </div>
                            
                            {/* Ayuda de variables */}
                            <div className="mt-3 p-2 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                              <p className="text-[10px] text-blue-400 font-medium mb-2 flex items-center gap-1"><LightBulbIcon size="xs" /> Variables disponibles:</p>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-[10px] text-blue-300 font-medium flex items-center gap-1"><FolderIcon size="xs" /> Del registro inicial:</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <code className="text-[9px] bg-blue-500/20 px-1 rounded text-blue-200">{"{{recordData.producto}}"}</code>
                                    <code className="text-[9px] bg-blue-500/20 px-1 rounded text-blue-200">{"{{recordData.cliente}}"}</code>
                                    <code className="text-[9px] bg-blue-500/20 px-1 rounded text-blue-200">{"{{recordData.cantidad}}"}</code>
                                  </div>
                                </div>
                                {getAvailableVariables().filter(v => v.name !== 'recordData').map(v => (
                                  <div key={v.name}>
                                    <p className="text-[10px] text-blue-300 font-medium flex items-center gap-1"><ClipboardIcon size="xs" /> {v.description}:</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      <code className="text-[9px] bg-emerald-500/20 px-1 rounded text-emerald-200">{`{{${v.name}.precio}}`}</code>
                                      <code className="text-[9px] bg-emerald-500/20 px-1 rounded text-emerald-200">{`{{${v.name}.stock}}`}</code>
                                      <code className="text-[9px] bg-emerald-500/20 px-1 rounded text-emerald-200">{`{{${v.name}.nombre}}`}</code>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Notificación */}
                        {selectedNode.data?.actionType === 'notification' && (
                          <>
                            <div>
                              <label className="block text-xs text-zinc-500 mb-1.5">Título</label>
                              <input
                                type="text"
                                value={selectedNode.data?.title || ''}
                                onChange={(e) => updateSelectedNodeData('title', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                                placeholder="Título de la notificación"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-zinc-500 mb-1.5">Mensaje</label>
                              <textarea
                                value={selectedNode.data?.message || ''}
                                onChange={(e) => updateSelectedNodeData('message', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                                style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                                placeholder="Contenido del mensaje"
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {selectedNode.type === 'response' && (
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1.5">Mensaje</label>
                        <textarea
                          value={selectedNode.data?.message || ''}
                          onChange={(e) => updateSelectedNodeData('message', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                          style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                          placeholder="Escribe el mensaje..."
                        />
                      </div>
                    )}

                    {/* Botón eliminar */}
                    <button
                      onClick={() => handleDeleteNode(selectedNode.id)}
                      className="w-full px-4 py-2.5 rounded-lg text-red-400 text-sm hover:bg-red-500/10 flex items-center justify-center gap-2 transition-all"
                      style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    >
                      <TrashIcon size="sm" /> Eliminar nodo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Sin flujo seleccionado */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-400" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))' }}>
                {Icons.flow}
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">Editor de Flujos</h2>
              <p className="text-zinc-500 mb-8">
                Crea automatizaciones visuales conectando bloques. 
                Sin código, sin complicaciones.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { icon: <RocketIcon size="lg" />, title: 'Fácil de usar', desc: 'Arrastra y suelta' },
                  { icon: <BoltIcon size="lg" />, title: 'Automático', desc: 'Se ejecuta solo' },
                  { icon: <LinkIcon size="lg" />, title: 'Conectado', desc: 'Con tus datos' },
                  { icon: <ChatIcon size="lg" />, title: 'Inteligente', desc: 'Con tu agente IA' },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl text-left" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-2xl mb-2 block text-amber-400">{item.icon}</span>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-zinc-600">{item.desc}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCreateFlow}
                disabled={isCreating}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-400 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)' }}
              >
                {isCreating ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </>
                ) : (
                  <>
                    {Icons.plus}
                    Crear mi primer flujo
                  </>
                )}
              </button>
              
              {createError && (
                <p className="mt-4 text-sm text-red-400 bg-red-500/10 px-4 py-2 rounded-lg">
                  {createError}
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Sidebar derecho - Bloques arrastrables */}
      {selectedFlow && (
        <aside 
          data-tour="flow-nodes-panel"
          className="w-72 flex flex-col backdrop-blur-xl" 
          style={{ 
            background: 'linear-gradient(180deg, rgba(15, 15, 22, 0.98), rgba(10, 10, 15, 0.99))',
            borderLeft: '1px solid rgba(255,255,255,0.06)' 
          }}
        >
          {/* Header */}
          <div className="p-4\" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2v2H7a1 1 0 00-1 1v2H4V6zM4 17h2v2a1 1 0 001 1h2v2H7a2 2 0 01-2-2v-3zM17 4h2a2 2 0 012 2v3h-2V7a1 1 0 00-1-1h-2V4h1zM20 17h-2v2a1 1 0 01-1 1h-2v2h3a2 2 0 002-2v-3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Bloques</h3>
                <p className="text-[11px] text-slate-500">Arrastra al canvas</p>
              </div>
            </div>
          </div>

          {/* Bloques por categoría */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {blockCategories.map(category => (
              <div key={category.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Category Header */}
                <div 
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))' }}
                >
                  <span className="text-base">{category.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">{category.label}</p>
                    <p className="text-[10px] text-slate-500">{category.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">
                    {category.blocks.length}
                  </span>
                </div>
                
                {/* Category Blocks */}
                <div className="space-y-1 p-2 bg-black/20">
                  {category.blocks.map(block => (
                    <div
                      key={block.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, block.type)}
                      className="group relative p-2 rounded-lg cursor-grab hover:bg-white/5 active:scale-[0.98] active:cursor-grabbing transition-all duration-150"
                      style={{ borderLeft: `2px solid ${block.color}` }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0"
                          style={{ 
                            background: `linear-gradient(135deg, ${block.color}, ${block.color}cc)`,
                            boxShadow: `0 2px 8px ${block.color}30`
                          }}
                        >
                          {block.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white">{block.label}</p>
                          <p className="text-[10px] text-slate-500 truncate">{block.description}</p>
                        </div>
                        <svg className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </div>
                      {/* Tooltip */}
                      <div 
                        className="absolute left-0 right-0 bottom-full mb-1 px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                        style={{ 
                          background: 'rgba(15, 15, 25, 0.98)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}
                      >
                        <p className="text-[10px] text-slate-300">{block.help}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="p-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div 
              className="p-3 rounded-xl" 
              style={{ 
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))', 
                border: '1px solid rgba(245, 158, 11, 0.15)' 
              }}
            >
              <p className="text-xs text-amber-400 font-medium mb-2 flex items-center gap-1.5">
                <LightBulbIcon size="xs" /> Atajos de teclado
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400/60">Guardar</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-mono">Ctrl+S</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-400/60">Deshacer</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-mono">Ctrl+Z</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-400/60">Rehacer</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-mono">Ctrl+Y</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-400/60">Eliminar nodo</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 text-[10px]">Delete</kbd>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Modal de ayuda */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl" style={{ background: '#0c0c0f', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="sticky top-0 px-6 py-4 flex items-center justify-between" style={{ background: '#0c0c0f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-xl font-semibold text-white">¿Cómo usar los flujos?</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg text-zinc-500 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {Icons.close}
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-white font-medium mb-2 flex items-center gap-2"><TargetIcon size="sm" className="text-amber-400" /> ¿Qué es un flujo?</h3>
                <p className="text-sm text-zinc-400">
                  Un flujo es una automatización visual. Conectas bloques para crear acciones automáticas 
                  que se ejecutan cuando ocurre algo, como recibir un mensaje o una nueva cita.
                </p>
              </div>

              <div>
                <h3 className="text-white font-medium mb-3 flex items-center gap-2"><FolderIcon size="sm" className="text-blue-400" /> Los bloques</h3>
                <div className="space-y-2">
                  {availableBlocks.map(block => (
                    <div key={block.type} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ background: block.color }}
                      >
                        {block.icon}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{block.label}</p>
                        <p className="text-xs text-zinc-500">{block.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <h3 className="text-emerald-400 font-medium mb-2 flex items-center gap-2"><SparklesIcon size="sm" /> Pasos para crear un flujo</h3>
                <ol className="text-sm text-emerald-400/80 space-y-2 list-decimal list-inside">
                  <li>Arrastra un bloque "Inicio" al canvas</li>
                  <li>Agrega los bloques que necesites</li>
                  <li>Conecta los bloques arrastrando desde los puntos</li>
                  <li>Configura cada bloque según necesites</li>
                  <li>Guarda tu flujo</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Plantillas de Flujos */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0c0c0f', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h2 className="text-lg font-semibold text-white">Crear nuevo flujo</h2>
                <p className="text-sm text-zinc-500">Elige una plantilla o empieza desde cero</p>
              </div>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-2 rounded-lg text-zinc-500 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {Icons.close}
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {flowTemplates.map((template) => (
                  <button
                    key={template._id}
                    onClick={() => handleCreateFlow(template._id === 'empty' ? null : template)}
                    disabled={isCreating}
                    className={`group relative p-5 rounded-xl border text-left transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                      template.color === 'emerald' ? 'border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5' :
                      template.color === 'blue' ? 'border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5' :
                      template.color === 'purple' ? 'border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5' :
                      template.color === 'red' ? 'border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5' :
                      'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      template.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                      template.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                      template.color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
                      template.color === 'red' ? 'bg-red-500/10 text-red-400' :
                      'bg-white/5 text-zinc-400'
                    }`}>
                      {getTemplateIcon(template.icon)}
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">{template.name}</h3>
                    <p className="text-sm text-zinc-400">{template.description}</p>
                    {template.nodes && template.nodes.length > 0 && (
                      <div className="mt-2 text-xs text-zinc-600">
                        {template.nodes.length} bloques preconstruidos
                      </div>
                    )}
                    <div className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                      template.color === 'emerald' ? 'text-emerald-400' :
                      template.color === 'blue' ? 'text-blue-400' :
                      template.color === 'purple' ? 'text-purple-400' :
                      template.color === 'red' ? 'text-red-400' :
                      'text-zinc-400'
                    }`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </div>
  );
}
