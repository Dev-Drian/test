/**
 * ActionNode - Nodo de acción
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import styles from './NodeStyles.module.css';

export default function ActionNode({ id, data, selected }) {
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
    <div className={`${styles.node} ${styles.actionNode} ${selected ? styles.selected : ''}`}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <span className={styles.nodeIcon}>⚡</span>
        <span className={styles.nodeTitle}>Acción</span>
      </div>
      <div className={styles.nodeBody}>
        <select 
          className={styles.nodeSelect}
          value={data?.action || 'auto_create'}
          onChange={(e) => updateNodeData('action', e.target.value)}
        >
          <option value="auto_create">Auto-crear registro</option>
          <option value="auto_assign">Asignar automáticamente</option>
          <option value="set_value">Establecer valor</option>
          <option value="decrement">Decrementar valor</option>
          <option value="validate_unique">Validar unicidad</option>
          <option value="send_notification">Enviar notificación</option>
          <option value="calculate_availability">Calcular disponibilidad</option>
        </select>
        {(data?.action === 'set_value' || data?.action === 'decrement') && (
          <>
            <input 
              type="text" 
              placeholder="Campo..." 
              className={styles.nodeInput}
              value={data?.field || ''}
              onChange={(e) => updateNodeData('field', e.target.value)}
              style={{ marginTop: '8px' }}
            />
            {data?.action === 'set_value' && (
              <input 
                type="text" 
                placeholder="Valor..." 
                className={styles.nodeInput}
                value={data?.value || ''}
                onChange={(e) => updateNodeData('value', e.target.value)}
                style={{ marginTop: '8px' }}
              />
            )}
          </>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}
