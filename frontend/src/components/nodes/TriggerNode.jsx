/**
 * TriggerNode - Nodo de inicio del flujo
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import styles from './NodeStyles.module.css';

export default function TriggerNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  return (
    <div className={`${styles.node} ${styles.triggerNode} ${selected ? styles.selected : ''}`}>
      <div className={styles.nodeHeader}>
        <span className={styles.nodeTitle}>Trigger</span>
      </div>
      <div className={styles.nodeBody}>
        <select 
          className={styles.nodeSelect}
          value={data?.trigger || 'create'}
          onChange={(e) => updateNodeData('trigger', e.target.value)}
        >
          <option value="create">Cuando quiera CREAR</option>
          <option value="query">Cuando quiera CONSULTAR</option>
          <option value="update">Cuando quiera ACTUALIZAR</option>
          <option value="availability">Cuando pregunte DISPONIBILIDAD</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}
