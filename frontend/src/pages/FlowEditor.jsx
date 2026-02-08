/**
 * FlowEditor - Editor visual de flujos tipo n8n
 * Permite crear y editar flujos con drag & drop
 */
import { useCallback, useState, useEffect, useMemo } from 'react';
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
import { useWorkspace } from '../context/WorkspaceContext';
import { api } from '../api/client';
import styles from './FlowEditor.module.css';

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

// Nodos disponibles para arrastrar
const availableNodes = [
  { type: 'trigger', label: 'Trigger', color: '#10b981' },
  { type: 'table', label: 'Tabla', color: '#3b82f6' },
  { type: 'condition', label: 'Condición', color: '#f59e0b' },
  { type: 'action', label: 'Acción', color: '#8b5cf6' },
  { type: 'availability', label: 'Disponibilidad', color: '#06b6d4' },
  { type: 'response', label: 'Respuesta', color: '#ec4899' },
];

export default function FlowEditor() {
  const { workspaceId } = useWorkspace();
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [tables, setTables] = useState([]);
  const [flowName, setFlowName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estado de React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Cargar flujos y tablas
  useEffect(() => {
    if (!workspaceId) return;
    
    const loadData = async () => {
      try {
        const [flowsRes, tablesRes] = await Promise.all([
          api.get('/flow/list', { params: { workspaceId } }),
          api.get('/table/list', { params: { workspaceId } }),
        ]);
        setFlows(flowsRes.data || []);
        setTables(tablesRes.data || []);
        console.log('Tablas cargadas:', tablesRes.data?.length || 0);
        console.log('Flujos cargados:', flowsRes.data?.length || 0);
      } catch (err) {
        console.error('Error loading data:', err);
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
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
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

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      };

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { 
          label: availableNodes.find(n => n.type === type)?.label || type,
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
        name: 'Nuevo Flujo',
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
    // Inyectar tablas a cada nodo para que puedan mostrarlas
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
      // Limpiar tables de los nodos antes de guardar (no necesitamos guardarlas)
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
      
      // Actualizar lista
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
    if (!confirm('¿Eliminar este flujo?')) return;
    
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

  return (
    <div className={styles.container}>
      {/* Sidebar izquierdo - Lista de flujos */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3>Flujos</h3>
          <button onClick={handleCreateFlow} className={styles.addBtn}>
            + Nuevo
          </button>
        </div>
        
        <div className={styles.flowList}>
          {flows.map(flow => (
            <div
              key={flow._id}
              className={`${styles.flowItem} ${selectedFlow?._id === flow._id ? styles.active : ''}`}
              onClick={() => handleSelectFlow(flow)}
            >
              <span>{flow.name}</span>
              <span className={styles.flowStatus}>
                {flow.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          ))}
          {flows.length === 0 && (
            <p className={styles.emptyMessage}>No hay flujos. Crea uno nuevo.</p>
          )}
        </div>

        <hr />
        
        {/* Panel de nodos arrastrables */}
        <div className={styles.nodePanel}>
          <h4>Nodos</h4>
          <p className={styles.hint}>Arrastra al canvas →</p>
          {availableNodes.map(node => (
            <div
              key={node.type}
              className={`${styles.draggableNode} ${styles[node.type] || ''}`}
              style={{ borderLeftColor: node.color }}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
            >
              {node.label}
            </div>
          ))}
        </div>
      </aside>

      {/* Área principal - Editor de flujo */}
      <main className={styles.editorArea}>
        {selectedFlow ? (
          <>
            {/* Toolbar */}
            <div className={styles.toolbar}>
              <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className={styles.flowNameInput}
                placeholder="Nombre del flujo"
              />
              <button onClick={handleSaveFlow} disabled={isSaving} className={styles.saveBtn}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={handleDeleteFlow} className={styles.deleteBtn}>
                Eliminar
              </button>
            </div>

            {/* Canvas de React Flow */}
            <div className={styles.flowCanvas}>
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
              >
                <Controls 
                  style={{ 
                    background: '#1a1a1a', 
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <MiniMap 
                  style={{ 
                    background: '#1a1a1a',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                  maskColor="rgba(0, 0, 0, 0.6)"
                  nodeColor="#3b82f6"
                />
                <Background variant="dots" gap={12} size={1} color="#333" />
                <Panel position="top-right" className={styles.panelInfo}>
                  <div>Nodos: {nodes.length}</div>
                  <div>Conexiones: {edges.length}</div>
                </Panel>
              </ReactFlow>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <h2>Editor de Flujos</h2>
            <p>Selecciona un flujo existente o crea uno nuevo</p>
            <button onClick={handleCreateFlow} className={styles.createBtn}>
              + Crear Flujo
            </button>
          </div>
        )}
      </main>

      {/* Sidebar derecho - Propiedades del nodo seleccionado */}
      <aside className={styles.propertiesPanel}>
        <h3>Propiedades</h3>
        {nodes.find(n => n.selected) ? (
          <div className={styles.nodeProperties}>
            <label>Tipo</label>
            <p>{nodes.find(n => n.selected)?.type}</p>
            
            <label>Tabla conectada</label>
            <select className={styles.select}>
              <option value="">Seleccionar...</option>
              {tables.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
            
            <label>Acción</label>
            <select className={styles.select}>
              <option value="create">Crear registro</option>
              <option value="read">Leer datos</option>
              <option value="update">Actualizar</option>
              <option value="validate">Validar</option>
            </select>
          </div>
        ) : (
          <p className={styles.hint}>Selecciona un nodo para ver sus propiedades</p>
        )}
      </aside>
    </div>
  );
}
