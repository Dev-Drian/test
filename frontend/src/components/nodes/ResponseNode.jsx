/**
 * ResponseNode - Nodo de respuesta al usuario
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import styles from './NodeStyles.module.css';

export default function ResponseNode({ id, data, selected }) {
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
    <div className={`${styles.node} ${styles.responseNode} ${selected ? styles.selected : ''}`}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <span className={styles.nodeTitle}>Respuesta</span>
      </div>
      <div className={styles.nodeBody}>
        <select 
          className={styles.nodeSelect}
          value={data?.type || 'success'}
          onChange={(e) => updateNodeData('type', e.target.value)}
        >
          <option value="success">Éxito</option>
          <option value="error">Error</option>
          <option value="options">Mostrar opciones</option>
          <option value="question">Hacer pregunta</option>
          <option value="custom">Mensaje personalizado</option>
        </select>
        <textarea 
          className={styles.nodeTextarea}
          placeholder="Mensaje al usuario..."
          rows={3}
          value={data?.message || ''}
          onChange={(e) => updateNodeData('message', e.target.value)}
        />
      </div>
    </div>
  );
}
