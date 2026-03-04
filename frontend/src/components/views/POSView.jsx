/**
 * POSView - Punto de Venta Profesional
 * Sistema POS con tema oscuro, diseño moderno y UX optimizada
 */
import React, { useState, useMemo } from 'react';
import { api } from '../../api/client';

// Configuración de estados con tema oscuro
const STATUS_CONFIG = {
  libre: { 
    label: 'Libre', 
    bgClass: 'from-emerald-500/20 to-emerald-600/10',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
  },
  disponible: { 
    label: 'Disponible',
    bgClass: 'from-emerald-500/20 to-emerald-600/10',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
  },
  ocupada: { 
    label: 'Ocupada',
    bgClass: 'from-red-500/20 to-red-600/10',
    borderClass: 'border-red-500/40',
    textClass: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-300',
  },
  activa: { 
    label: 'Activa',
    bgClass: 'from-red-500/20 to-red-600/10',
    borderClass: 'border-red-500/40',
    textClass: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-300',
  },
  reservada: { 
    label: 'Reservada',
    bgClass: 'from-amber-500/20 to-amber-600/10',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300',
  },
  bloqueada: { 
    label: 'Bloqueada',
    bgClass: 'from-slate-500/20 to-slate-600/10',
    borderClass: 'border-slate-500/40',
    textClass: 'text-slate-400',
    badgeClass: 'bg-slate-500/20 text-slate-300',
  },
};

const ORDER_STATUS_CONFIG = {
  abierto: { label: 'Abierto', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400' },
  open: { label: 'Abierto', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400' },
  pendiente: { label: 'En Cocina', bgClass: 'bg-amber-500/20', textClass: 'text-amber-400' },
  pending: { label: 'Pendiente', bgClass: 'bg-amber-500/20', textClass: 'text-amber-400' },
  listo: { label: 'Listo', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-400' },
  ready: { label: 'Listo', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-400' },
  pagado: { label: 'Pagado', bgClass: 'bg-slate-500/20', textClass: 'text-slate-400' },
  paid: { label: 'Pagado', bgClass: 'bg-slate-500/20', textClass: 'text-slate-400' },
};

const Icons = {
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  minus: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  ),
  clipboard: (
    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  kitchen: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  money: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function POSView({ view, data, products, productsByCategory, workspaceId, onRefresh }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Categorías disponibles
  const categories = useMemo(() => {
    return Object.keys(productsByCategory || {});
  }, [productsByCategory]);

  // Productos filtrados
  const filteredProducts = useMemo(() => {
    let prods = activeCategory 
      ? productsByCategory[activeCategory] || []
      : products || [];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      prods = prods.filter(p => 
        (p.nombre || p.name || '').toLowerCase().includes(term) ||
        (p.descripcion || p.description || '').toLowerCase().includes(term)
      );
    }
    
    return prods;
  }, [activeCategory, productsByCategory, products, searchTerm]);

  // Obtener mesa seleccionada con su pedido
  const selectedTableData = useMemo(() => {
    if (!selectedTable || !data) return null;
    return data.find(t => t._id === selectedTable);
  }, [selectedTable, data]);

  // Acciones del pedido
  const handleAddProduct = async (product) => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      await api.post(`/api/views/${view._id}/order`, {
        workspaceId,
        tableId: selectedTable,
        action: 'add',
        productId: product._id,
        quantity: 1,
      });
      onRefresh?.();
    } catch (err) {
      console.error('Error adding product:', err);
      alert('Error al agregar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async (productId) => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      await api.post(`/api/views/${view._id}/order`, {
        workspaceId,
        tableId: selectedTable,
        action: 'remove',
        productId,
        quantity: 1,
      });
      onRefresh?.();
    } catch (err) {
      console.error('Error removing product:', err);
      alert('Error al quitar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      await api.post(`/api/views/${view._id}/order`, {
        workspaceId,
        tableId: selectedTable,
        action: 'update-status',
        status,
      });
      onRefresh?.();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error al actualizar estado');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseOrder = async () => {
    if (!selectedTable) return;
    
    if (!confirm('¿Cerrar y cobrar este pedido?')) return;
    
    setLoading(true);
    try {
      await api.post(`/api/views/${view._id}/order`, {
        workspaceId,
        tableId: selectedTable,
        action: 'close',
      });
      setSelectedTable(null);
      onRefresh?.();
    } catch (err) {
      console.error('Error closing order:', err);
      alert('Error al cerrar pedido');
    } finally {
      setLoading(false);
    }
  };

  // Obtener info de la mesa
  const getTableName = (table) => {
    return table.numero || table.nombre || table.name || `Mesa ${table._id?.slice(-4)}`;
  };

  const getTableStatus = (table) => {
    return table._tableStatus || 'libre';
  };

  const getActiveOrder = (table) => {
    return table._activeOrder;
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900/50">
      {/* Panel izquierdo: Mesas */}
      <div className="w-1/4 border-r border-slate-700/50 p-5 overflow-y-auto bg-slate-800/30">
        <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          Mesas
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          {data?.map(table => {
            const status = getTableStatus(table);
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.libre;
            const isSelected = selectedTable === table._id;
            const order = getActiveOrder(table);
            
            return (
              <button
                key={table._id}
                onClick={() => setSelectedTable(table._id)}
                className={`
                  group relative p-4 rounded-xl border-2 transition-all duration-200
                  bg-gradient-to-br ${config.bgClass} ${config.borderClass}
                  ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900 scale-[1.02]' : 'hover:scale-[1.02]'}
                  text-center
                `}
              >
                <div className="font-bold text-xl text-white">{getTableName(table)}</div>
                <div className={`text-xs mt-1 ${config.textClass} capitalize`}>{config.label}</div>
                {order && (
                  <div className="mt-2 pt-2 border-t border-slate-700/30">
                    <span className="text-lg font-bold text-emerald-400">
                      ${table._total?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {(!data || data.length === 0) && (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-700/50 flex items-center justify-center text-slate-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </div>
            <p className="text-slate-500">No hay mesas configuradas</p>
          </div>
        )}
      </div>

      {/* Panel central: Productos */}
      <div className="flex-1 flex flex-col p-5 overflow-hidden bg-slate-900/30">
        <div className="mb-4">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Productos
          </h3>
          
          {/* Búsqueda */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
              {Icons.search}
            </div>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          
          {/* Categorías */}
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  !activeCategory 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700/50'
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeCategory === cat 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                      : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(product => {
              const name = product.nombre || product.name || 'Sin nombre';
              const price = parseFloat(product.precio || product.price || 0);
              const available = product.disponible !== false && product.available !== false;
              
              return (
                <button
                  key={product._id}
                  onClick={() => handleAddProduct(product)}
                  disabled={!selectedTable || loading || !available}
                  className={`
                    group relative p-4 rounded-xl border transition-all duration-200 text-left
                    ${available && selectedTable
                      ? 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700/50 hover:border-indigo-500/50 cursor-pointer' 
                      : 'bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                    {name}
                  </div>
                  <div className="text-lg font-bold text-emerald-400 mt-2">
                    ${price.toFixed(2)}
                  </div>
                  {!available && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-red-500/20 text-[10px] text-red-400 font-medium">
                      No disponible
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">
                {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
              </p>
            </div>
          )}
        </div>
        
        {!selectedTable && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <p className="text-amber-400 font-medium">Selecciona una mesa para agregar productos</p>
          </div>
        )}
      </div>

      {/* Panel derecho: Pedido actual */}
      <div className="w-1/3 border-l border-slate-700/50 flex flex-col bg-slate-800/30">
        {selectedTableData ? (
          <>
            {/* Header del pedido */}
            <div className={`p-5 border-b border-slate-700/50 bg-gradient-to-br ${
              STATUS_CONFIG[getTableStatus(selectedTableData)]?.bgClass || 'from-slate-700/50'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-xl text-white">{getTableName(selectedTableData)}</h3>
                  <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl ${
                    STATUS_CONFIG[getTableStatus(selectedTableData)]?.badgeClass || 'bg-slate-700/50 text-slate-400'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span className="text-xs font-semibold">
                      {STATUS_CONFIG[getTableStatus(selectedTableData)]?.label || getTableStatus(selectedTableData)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="p-2 rounded-xl hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors"
                >
                  {Icons.close}
                </button>
              </div>
            </div>

            {/* Items del pedido */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedTableData._activeOrder?.items?.length > 0 ? (
                <div className="space-y-2">
                  {selectedTableData._activeOrder.items.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{item.nombre || item.name}</div>
                        <div className="text-sm text-slate-400 mt-0.5">
                          ${(item.precio || item.price || 0).toFixed(2)} × {item.cantidad || item.quantity || 1}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-3">
                        <span className="font-bold text-emerald-400">
                          ${item.subtotal?.toFixed(2) || '0.00'}
                        </span>
                        <button
                          onClick={() => handleRemoveProduct(item.productId || item._id)}
                          disabled={loading}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
                        >
                          {Icons.minus}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-600 mb-4">
                    {Icons.clipboard}
                  </div>
                  <p className="text-slate-400 font-medium">Sin productos en el pedido</p>
                  <p className="text-sm text-slate-500 mt-1">Selecciona productos del menú</p>
                </div>
              )}
            </div>

            {/* Footer con total y acciones */}
            <div className="border-t border-slate-700/50 p-5 bg-slate-900/50">
              {/* Total */}
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700/50">
                <span className="text-lg font-medium text-slate-400">Total</span>
                <span className="text-3xl font-bold text-emerald-400">
                  ${selectedTableData._total?.toFixed(2) || '0.00'}
                </span>
              </div>

              {/* Estado del pedido */}
              {selectedTableData._activeOrder && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-slate-500">Estado:</span>
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    ORDER_STATUS_CONFIG[selectedTableData._activeOrder.estado]?.bgClass || 'bg-slate-700/50'
                  } ${ORDER_STATUS_CONFIG[selectedTableData._activeOrder.estado]?.textClass || 'text-slate-400'}`}>
                    {ORDER_STATUS_CONFIG[selectedTableData._activeOrder.estado]?.label || selectedTableData._activeOrder.estado || 'Abierto'}
                  </span>
                </div>
              )}

              {/* Botones de acción */}
              <div className="space-y-3">
                {selectedTableData._activeOrder && (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus('pendiente')}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 font-medium shadow-lg shadow-amber-500/25 transition-all"
                      >
                        {Icons.kitchen}
                        <span>A Cocina</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('listo')}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 font-medium shadow-lg shadow-emerald-500/25 transition-all"
                      >
                        {Icons.check}
                        <span>Listo</span>
                      </button>
                    </div>
                    <button
                      onClick={handleCloseOrder}
                      disabled={loading || !selectedTableData._activeOrder}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 font-bold text-lg shadow-lg shadow-indigo-500/25 transition-all"
                    >
                      {Icons.money}
                      <span>Cobrar ${selectedTableData._total?.toFixed(2) || '0.00'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-600">
                {Icons.clipboard}
              </div>
              <p className="text-slate-400 font-medium">Selecciona una mesa</p>
              <p className="text-sm text-slate-500 mt-1">para ver o crear un pedido</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
