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

const nodeTypes = {
  trigger: TriggerNode,
  table: TableNode,
  condition: ConditionNode,
  action: ActionNode,
  availability: AvailabilityNode,
  response: ResponseNode,
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
};

// Bloques disponibles con descripciones amigables
const availableBlocks = [
  { 
    type: 'trigger', 
    emoji: '🚀',
    label: 'Inicio', 
    color: '#10b981',
    description: 'Cuando algo sucede',
  },
  { 
    type: 'table', 
    emoji: '📊',
    label: 'Datos', 
    color: '#3b82f6',
    description: 'Buscar o guardar',
  },
  { 
    type: 'condition', 
    emoji: '🔀',
    label: 'Decisión', 
    color: '#f59e0b',
    description: '¿Sí o no?',
  },
  { 
    type: 'action', 
    emoji: '⚡',
    label: 'Acción', 
    color: '#8b5cf6',
    description: 'Hacer algo',
  },
  { 
    type: 'availability', 
    emoji: '📅',
    label: 'Horario', 
    color: '#06b6d4',
    description: 'Ver disponibilidad',
  },
  { 
    type: 'response', 
    emoji: '💬',
    label: 'Respuesta', 
    color: '#ec4899',
    description: 'Enviar mensaje',
  },
];

export default function FlowEditor() {
  const { workspaceId, workspaceName } = useWorkspace();
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [tables, setTables] = useState([]);
  const [flowName, setFlowName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Estado de React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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

  // Crear nuevo flujo
  const handleCreateFlow = async () => {
    if (!workspaceId) return;
    
    try {
      const res = await api.post('/flow/create', {
        workspaceId,
        name: 'Mi nuevo flujo',
        description: '',
      });
      
      setFlows([...flows, res.data]);
      setSelectedFlow(res.data);
      setFlowName(res.data.name);
      setNodes(res.data.nodes || []);
      setEdges(res.data.edges || []);
    } catch (err) {
      console.error('Error creating flow:', err);
    }
  };

  // Seleccionar flujo existente
  const handleSelectFlow = (flow) => {
    setSelectedFlow(flow);
    setFlowName(flow.name);
    const nodesWithTables = (flow.nodes || []).map(node => ({
      ...node,
      data: { ...node.data, tables }
    }));
    setNodes(nodesWithTables);
    setEdges(flow.edges || []);
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
    } catch (err) {
      console.error('Error saving flow:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar flujo
  const handleDeleteFlow = async () => {
    if (!selectedFlow || !workspaceId) return;
    if (!confirm('¿Eliminar este flujo? Esta acción no se puede deshacer.')) return;
    
    try {
      await api.delete('/flow/delete', {
        data: { workspaceId, flowId: selectedFlow._id }
      });
      
      setFlows(flows.filter(f => f._id !== selectedFlow._id));
      setSelectedFlow(null);
      setNodes([]);
      setEdges([]);
    } catch (err) {
      console.error('Error deleting flow:', err);
    }
  };

  // Sin workspace
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#09090b' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-400" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            {Icons.flow}
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Editor de Flujos</h1>
          <p className="text-zinc-500 mb-6 max-w-sm">
            Selecciona un workspace para crear automatizaciones
          </p>
          <Link 
            to="/workspaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors"
          >
            Ir a Workspaces
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#09090b' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-2 rounded-full" style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }} />
            <div className="absolute inset-0 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-zinc-500">Cargando flujos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)] flex" style={{ background: '#09090b' }}>
      {/* Sidebar izquierdo - Lista de flujos */}
      <aside className="w-64 flex flex-col" style={{ background: '#0c0c0f', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
              {Icons.flow}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Flujos</h2>
              <p className="text-xs text-zinc-600 truncate max-w-[140px]">{workspaceName}</p>
            </div>
          </div>
          
          <button
            onClick={handleCreateFlow}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-400 transition-colors"
          >
            {Icons.plus}
            Nuevo flujo
          </button>
        </div>

        {/* Lista de flujos */}
        <div className="flex-1 overflow-y-auto p-3">
          {flows.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-zinc-600" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {Icons.folder}
              </div>
              <p className="text-sm text-zinc-500 mb-1">Sin flujos</p>
              <p className="text-xs text-zinc-600">Crea tu primer flujo</p>
            </div>
          ) : (
            <div className="space-y-1">
              {flows.map(flow => (
                <button
                  key={flow._id}
                  onClick={() => handleSelectFlow(flow)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 ${
                    selectedFlow?._id === flow._id
                      ? 'text-amber-400'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  style={{
                    background: selectedFlow?._id === flow._id 
                      ? 'rgba(245, 158, 11, 0.1)' 
                      : 'transparent',
                    border: selectedFlow?._id === flow._id 
                      ? '1px solid rgba(245, 158, 11, 0.3)' 
                      : '1px solid transparent',
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ background: selectedFlow?._id === flow._id ? '#f59e0b' : 'rgba(255,255,255,0.05)' }}
                  >
                    ⚡
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{flow.name}</p>
                    <p className="text-[10px] text-zinc-600">
                      {flow.nodes?.length || 0} bloques
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ayuda */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setShowHelp(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-zinc-500 text-sm hover:text-amber-400 hover:bg-amber-500/10 transition-all"
          >
            {Icons.help}
            ¿Cómo funciona?
          </button>
        </div>
      </aside>

      {/* Área principal - Canvas */}
      <main className="flex-1 flex flex-col">
        {selectedFlow ? (
          <>
            {/* Toolbar */}
            <div className="h-14 flex items-center gap-3 px-4" style={{ background: '#0c0c0f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="flex-1 max-w-xs px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                placeholder="Nombre del flujo"
              />
              
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-zinc-600 px-2">
                  {nodes.length} bloques · {edges.length} conexiones
                </span>
                <button 
                  onClick={handleSaveFlow} 
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    Icons.save
                  )}
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <button 
                  onClick={handleDeleteFlow}
                  className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Eliminar flujo"
                >
                  {Icons.trash}
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                fitView
                defaultEdgeOptions={{
                  animated: true,
                  style: { stroke: '#10b981', strokeWidth: 2 },
                }}
              >
                <Controls 
                  style={{ 
                    background: '#0c0c0f', 
                    borderColor: 'rgba(255,255,255,0.06)',
                    borderRadius: '12px'
                  }}
                />
                <MiniMap 
                  style={{ 
                    background: '#0c0c0f',
                    borderColor: 'rgba(255,255,255,0.06)',
                    borderRadius: '12px'
                  }}
                  maskColor="rgba(0, 0, 0, 0.7)"
                  nodeColor={(node) => {
                    const block = availableBlocks.find(b => b.type === node.type);
                    return block?.color || '#3b82f6';
                  }}
                />
                <Background variant="dots" gap={20} size={1} color="rgba(255,255,255,0.03)" />

                {/* Instrucciones si está vacío */}
                {nodes.length === 0 && (
                  <Panel position="top-center">
                    <div className="px-6 py-4 rounded-xl text-center mt-20" style={{ background: 'rgba(12, 12, 15, 0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-white font-medium mb-1">¡Empieza a crear!</p>
                      <p className="text-sm text-zinc-500">
                        Arrastra bloques desde el panel derecho →
                      </p>
                    </div>
                  </Panel>
                )}
              </ReactFlow>
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
                  { icon: '🚀', title: 'Fácil de usar', desc: 'Arrastra y suelta' },
                  { icon: '⚡', title: 'Automático', desc: 'Se ejecuta solo' },
                  { icon: '🔗', title: 'Conectado', desc: 'Con tus datos' },
                  { icon: '💬', title: 'Inteligente', desc: 'Con tu agente IA' },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl text-left" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-2xl mb-2 block">{item.icon}</span>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-zinc-600">{item.desc}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCreateFlow}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-400 transition-colors shadow-lg"
                style={{ boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)' }}
              >
                {Icons.plus}
                Crear mi primer flujo
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Sidebar derecho - Bloques arrastrables */}
      {selectedFlow && (
        <aside className="w-72 flex flex-col" style={{ background: '#0c0c0f', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Header */}
          <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Bloques</h3>
            <p className="text-xs text-zinc-600">Arrastra al canvas para agregar</p>
          </div>

          {/* Bloques */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {availableBlocks.map(block => (
              <div
                key={block.type}
                draggable
                onDragStart={(e) => onDragStart(e, block.type)}
                className="group p-4 rounded-xl cursor-grab hover:scale-[1.02] active:scale-[0.98] active:cursor-grabbing transition-all"
                style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderLeft: `4px solid ${block.color}`
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                    style={{ background: block.color }}
                  >
                    {block.emoji}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{block.label}</p>
                    <p className="text-xs text-zinc-500">{block.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="p-3 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
              <p className="text-xs text-amber-400 font-medium mb-1">💡 Tip</p>
              <p className="text-xs text-amber-400/60">
                Conecta los bloques arrastrando desde los puntos de conexión
              </p>
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
                <h3 className="text-white font-medium mb-2">🎯 ¿Qué es un flujo?</h3>
                <p className="text-sm text-zinc-400">
                  Un flujo es una automatización visual. Conectas bloques para crear acciones automáticas 
                  que se ejecutan cuando ocurre algo, como recibir un mensaje o una nueva cita.
                </p>
              </div>

              <div>
                <h3 className="text-white font-medium mb-3">📦 Los bloques</h3>
                <div className="space-y-2">
                  {availableBlocks.map(block => (
                    <div key={block.type} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ background: block.color }}
                      >
                        {block.emoji}
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
                <h3 className="text-emerald-400 font-medium mb-2">✨ Pasos para crear un flujo</h3>
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
    </div>
  );
}
