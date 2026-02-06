/**
 * TableNode - Nodo de conexión a tabla
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import styles from './NodeStyles.module.css';

export default function TableNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const tables = data?.tables || [];
  
  // Actualizar data del nodo
  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  return (
    <div className={`${styles.node} ${styles.tableNode} ${selected ? styles.selected : ''}`}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <span className={styles.nodeIcon}>📋</span>
        <span className={styles.nodeTitle}>Tabla</span>
      </div>
      <div className={styles.nodeBody}>
        <select 
          className={styles.nodeSelect}
          value={data?.tableId || ''}
          onChange={(e) => updateNodeData('tableId', e.target.value)}
        >
          <option value="">Seleccionar tabla...</option>
          {tables.map(t => (
            <option key={t._id} value={t._id}>{t.name}</option>
          ))}
        </select>
        <select 
          className={styles.nodeSelect} 
          style={{ marginTop: '8px' }}
          value={data?.action || 'read'}
          onChange={(e) => updateNodeData('action', e.target.value)}
        >
          <option value="read">Leer datos</option>
          <option value="create">Crear registro</option>
          <option value="update">Actualizar</option>
          <option value="validate">Validar relación</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}
