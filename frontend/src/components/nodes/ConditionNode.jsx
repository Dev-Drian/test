/**
 * ConditionNode - Nodo de condición Si/Entonces
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import styles from './NodeStyles.module.css';

export default function ConditionNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const tables = data?.tables || [];

  const updateNodeData = useCallback((key, value) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    }));
  }, [id, setNodes]);

  return (
    <div className={`${styles.node} ${styles.conditionNode} ${selected ? styles.selected : ''}`}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <span className={styles.nodeIcon}>❓</span>
        <span className={styles.nodeTitle}>Condición</span>
      </div>
      <div className={styles.nodeBody}>
        <select 
          className={styles.nodeSelect}
          value={data?.condition || 'exists'}
          onChange={(e) => updateNodeData('condition', e.target.value)}
        >
          <option value="exists">Si existe</option>
          <option value="not_exists">Si NO existe</option>
          <option value="equals">Si es igual a</option>
          <option value="greater">Si es mayor que</option>
          <option value="available">Si está disponible</option>
        </select>
        <select 
          className={styles.nodeSelect}
          style={{ marginTop: '8px' }}
          value={data?.field || ''}
          onChange={(e) => updateNodeData('field', e.target.value)}
        >
          <option value="">Campo a evaluar...</option>
          <option value="stock">stock</option>
          <option value="estado">estado</option>
          <option value="fecha">fecha</option>
          <option value="hora">hora</option>
        </select>
        <input 
          type="text" 
          placeholder="Valor a comparar..." 
          className={styles.nodeInput}
          value={data?.value || ''}
          onChange={(e) => updateNodeData('value', e.target.value)}
        />
      </div>
      <div className={styles.conditionHandles}>
        <div className={styles.handleLabel}>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="yes" 
            className={styles.handleYes}
            style={{ left: '30%' }}
          />
          <span className={styles.handleText}>✓ Sí</span>
        </div>
        <div className={styles.handleLabel}>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="no" 
            className={styles.handleNo}
            style={{ left: '70%' }}
          />
          <span className={styles.handleText}>✗ No</span>
        </div>
      </div>
    </div>
  );
}
