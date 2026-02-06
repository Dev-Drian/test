/**
 * AvailabilityNode - Nodo de verificación de disponibilidad
 */
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import styles from './NodeStyles.module.css';

export default function AvailabilityNode({ id, data, selected }) {
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
    <div className={`${styles.node} ${styles.availabilityNode} ${selected ? styles.selected : ''}`}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <span className={styles.nodeIcon}>📅</span>
        <span className={styles.nodeTitle}>Disponibilidad</span>
      </div>
      <div className={styles.nodeBody}>
        <label className={styles.nodeLabel}>Tabla de staff</label>
        <select 
          className={styles.nodeSelect}
          value={data?.staffTable || ''}
          onChange={(e) => updateNodeData('staffTable', e.target.value)}
        >
          <option value="">Seleccionar...</option>
          {tables.map(t => (
            <option key={t._id} value={t._id}>{t.name}</option>
          ))}
        </select>
        
        <label className={styles.nodeLabel}>Verificar por</label>
        <div className={styles.checkboxGroup}>
          <label>
            <input 
              type="checkbox" 
              checked={data?.checkDate !== false}
              onChange={(e) => updateNodeData('checkDate', e.target.checked)}
            /> Fecha
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={data?.checkTime !== false}
              onChange={(e) => updateNodeData('checkTime', e.target.checked)}
            /> Hora
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={data?.checkService || false}
              onChange={(e) => updateNodeData('checkService', e.target.checked)}
            /> Servicio
          </label>
        </div>
      </div>
      <div className={styles.conditionHandles}>
        <div className={styles.handleLabel}>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="available" 
            className={styles.handleYes}
            style={{ left: '30%' }}
          />
          <span className={styles.handleText}>✓ Libre</span>
        </div>
        <div className={styles.handleLabel}>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="busy" 
            className={styles.handleNo}
            style={{ left: '70%' }}
          />
          <span className={styles.handleText}>✗ Ocupado</span>
        </div>
      </div>
    </div>
  );
}
