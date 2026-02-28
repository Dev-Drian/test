import { useState, useMemo } from 'react';

const Icons = {
  search: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  grid: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  list: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>,
  expand: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>,
  x: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
};

// Colores para las categorías/estados
const CATEGORY_COLORS = [
  '#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const getColorForValue = (value, index = 0) => {
  if (!value) return CATEGORY_COLORS[0];
  const hash = String(value).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLORS[(hash + index) % CATEGORY_COLORS.length];
};

export default function CardsView({ view, data, meta, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedCard, setSelectedCard] = useState(null);
  const [gridCols, setGridCols] = useState(3); // 2, 3, 4

  // Mapeo de campos
  const fieldMap = meta?.fieldMap || view?.fieldMap || {};

  // Procesar datos
  const cards = useMemo(() => {
    if (!data) return [];
    
    return data.map((item, index) => ({
      ...item,
      _displayTitle: item.title || item[fieldMap.title] || `Item ${index + 1}`,
      _displaySubtitle: item.subtitle || item[fieldMap.subtitle] || '',
      _displayDescription: item.description || item[fieldMap.description] || '',
      _displayImage: item.image || item[fieldMap.image] || null,
      _displayCategory: item.category || item[fieldMap.category] || item.status || '',
      _displayColor: item.color || getColorForValue(item.category || item.status, index),
    }));
  }, [data, fieldMap]);

  // Filtrar por búsqueda
  const filteredCards = useMemo(() => {
    if (!searchTerm.trim()) return cards;
    
    const term = searchTerm.toLowerCase();
    return cards.filter(card => 
      card._displayTitle?.toLowerCase().includes(term) ||
      card._displaySubtitle?.toLowerCase().includes(term) ||
      card._displayDescription?.toLowerCase().includes(term) ||
      card._displayCategory?.toLowerCase().includes(term)
    );
  }, [cards, searchTerm]);

  // Obtener campos adicionales para mostrar
  const additionalFields = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const excludedKeys = ['_id', 'id', 'title', 'subtitle', 'description', 'image', 'category', 'status', 'color', 'createdAt', 'updatedAt'];
    const sample = data[0];
    
    return Object.keys(sample)
      .filter(key => !key.startsWith('_') && !excludedKeys.includes(key))
      .slice(0, 4); // Máximo 4 campos adicionales
  }, [data]);

  const gridColsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-700/50">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {Icons.search}
          </span>
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          {/* Grid size */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50">
            {[2, 3, 4].map(cols => (
              <button
                key={cols}
                onClick={() => setGridCols(cols)}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  gridCols === cols
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cols}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg bg-slate-800/50 border border-slate-700/50 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-indigo-500 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {Icons.grid}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-indigo-500 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {Icons.list}
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid/List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <p className="text-lg">No hay registros</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchTerm ? 'Intenta con otro término de búsqueda' : 'Agrega datos a la tabla para verlos aquí'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className={`grid ${gridColsClass[gridCols]} gap-4`}>
            {filteredCards.map((card, index) => (
              <div
                key={card._id || index}
                onClick={() => setSelectedCard(card)}
                className="group relative bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden cursor-pointer hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200"
              >
                {/* Image */}
                {card._displayImage && (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={card._displayImage} 
                      alt={card._displayTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  {/* Category badge */}
                  {card._displayCategory && (
                    <span 
                      className="inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-2"
                      style={{ 
                        backgroundColor: `${card._displayColor}20`, 
                        color: card._displayColor 
                      }}
                    >
                      {card._displayCategory}
                    </span>
                  )}
                  
                  {/* Title */}
                  <h3 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                    {card._displayTitle}
                  </h3>
                  
                  {/* Subtitle */}
                  {card._displaySubtitle && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                      {card._displaySubtitle}
                    </p>
                  )}
                  
                  {/* Description */}
                  {card._displayDescription && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                      {card._displayDescription}
                    </p>
                  )}

                  {/* Additional fields */}
                  {additionalFields.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1">
                      {additionalFields.slice(0, 2).map(field => (
                        card[field] && (
                          <div key={field} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 capitalize">{field.replace(/_/g, ' ')}</span>
                            <span className="text-slate-300 truncate ml-2 max-w-[60%]">
                              {typeof card[field] === 'object' ? JSON.stringify(card[field]) : card[field]}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredCards.map((card, index) => (
              <div
                key={card._id || index}
                onClick={() => setSelectedCard(card)}
                className="group flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800 transition-all"
              >
                {/* Image thumbnail */}
                {card._displayImage && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                    <img 
                      src={card._displayImage} 
                      alt={card._displayTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                      {card._displayTitle}
                    </h3>
                    {card._displayCategory && (
                      <span 
                        className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{ 
                          backgroundColor: `${card._displayColor}20`, 
                          color: card._displayColor 
                        }}
                      >
                        {card._displayCategory}
                      </span>
                    )}
                  </div>
                  {card._displaySubtitle && (
                    <p className="text-sm text-slate-400 truncate">{card._displaySubtitle}</p>
                  )}
                </div>

                {/* Additional info */}
                <div className="hidden sm:flex items-center gap-4 shrink-0">
                  {additionalFields.slice(0, 2).map(field => (
                    card[field] && (
                      <div key={field} className="text-right">
                        <p className="text-xs text-slate-500 capitalize">{field.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-slate-300 truncate max-w-[100px]">
                          {typeof card[field] === 'object' ? JSON.stringify(card[field]) : card[field]}
                        </p>
                      </div>
                    )
                  ))}
                </div>

                {/* Expand icon */}
                <span className="text-slate-500 group-hover:text-indigo-400 transition-colors">
                  {Icons.expand}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCard && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedCard(null)}
        >
          <div 
            className="w-full max-w-lg max-h-[80vh] overflow-auto bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
              <h2 className="text-lg font-semibold text-white truncate pr-4">
                {selectedCard._displayTitle}
              </h2>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                {Icons.x}
              </button>
            </div>

            {/* Modal content */}
            <div className="p-4 space-y-4">
              {/* Image */}
              {selectedCard._displayImage && (
                <img 
                  src={selectedCard._displayImage}
                  alt={selectedCard._displayTitle}
                  className="w-full h-48 object-cover rounded-xl"
                />
              )}

              {/* Category */}
              {selectedCard._displayCategory && (
                <span 
                  className="inline-block px-3 py-1 text-sm font-medium rounded-full"
                  style={{ 
                    backgroundColor: `${selectedCard._displayColor}20`, 
                    color: selectedCard._displayColor 
                  }}
                >
                  {selectedCard._displayCategory}
                </span>
              )}

              {/* Subtitle */}
              {selectedCard._displaySubtitle && (
                <p className="text-slate-300">{selectedCard._displaySubtitle}</p>
              )}

              {/* Description */}
              {selectedCard._displayDescription && (
                <p className="text-slate-400">{selectedCard._displayDescription}</p>
              )}

              {/* All fields */}
              <div className="pt-4 border-t border-slate-700 space-y-3">
                {Object.entries(selectedCard)
                  .filter(([key]) => !key.startsWith('_') && key !== 'id')
                  .map(([key, value]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-200 break-words">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || '-')}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
