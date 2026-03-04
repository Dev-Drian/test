import { useState, useMemo } from 'react';

const Icons = {
  search: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  grid: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  list: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>,
  expand: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>,
  x: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  filter: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>,
  sortAsc: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" /></svg>,
  sortDesc: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" /></svg>,
  tag: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>,
  stats: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
};

// Colores para las categorías
const CATEGORY_COLORS = [
  { bg: '#4F46E5', light: 'rgba(79, 70, 229, 0.15)', text: '#A5B4FC' },
  { bg: '#EC4899', light: 'rgba(236, 72, 153, 0.15)', text: '#F9A8D4' },
  { bg: '#10B981', light: 'rgba(16, 185, 129, 0.15)', text: '#6EE7B7' },
  { bg: '#F59E0B', light: 'rgba(245, 158, 11, 0.15)', text: '#FCD34D' },
  { bg: '#EF4444', light: 'rgba(239, 68, 68, 0.15)', text: '#FCA5A5' },
  { bg: '#8B5CF6', light: 'rgba(139, 92, 246, 0.15)', text: '#C4B5FD' },
  { bg: '#06B6D4', light: 'rgba(6, 182, 212, 0.15)', text: '#67E8F9' },
  { bg: '#84CC16', light: 'rgba(132, 204, 22, 0.15)', text: '#BEF264' },
];

const getColorForValue = (value, index = 0) => {
  if (!value) return CATEGORY_COLORS[0];
  const hash = String(value).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLORS[(hash + index) % CATEGORY_COLORS.length];
};

export default function CardsView({ view, data, meta, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCard, setSelectedCard] = useState(null);
  const [gridCols, setGridCols] = useState(3);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [sortDir, setSortDir] = useState('asc');
  const [showStats, setShowStats] = useState(false);

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
      _displayColor: getColorForValue(item.category || item.status, index),
    }));
  }, [data, fieldMap]);

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const cats = new Set();
    cards.forEach(c => { if (c._displayCategory) cats.add(c._displayCategory); });
    return Array.from(cats);
  }, [cards]);

  // Estadísticas
  const stats = useMemo(() => {
    const byCat = {};
    categories.forEach(c => { byCat[c] = 0; });
    cards.forEach(c => { if (c._displayCategory && byCat[c._displayCategory] !== undefined) byCat[c._displayCategory]++; });
    return { total: cards.length, byCategory: byCat, withImage: cards.filter(c => c._displayImage).length };
  }, [cards, categories]);

  // Filtrar y ordenar
  const filteredCards = useMemo(() => {
    let result = cards;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(card => 
        card._displayTitle?.toLowerCase().includes(term) ||
        card._displaySubtitle?.toLowerCase().includes(term) ||
        card._displayDescription?.toLowerCase().includes(term) ||
        card._displayCategory?.toLowerCase().includes(term)
      );
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter(c => c._displayCategory === categoryFilter);
    }
    
    if (sortBy !== 'default') {
      result = [...result].sort((a, b) => {
        const aVal = a[sortBy] || a[`_display${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`] || '';
        const bVal = b[sortBy] || b[`_display${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`] || '';
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    
    return result;
  }, [cards, searchTerm, categoryFilter, sortBy, sortDir]);

  const additionalFields = useMemo(() => {
    if (!data || data.length === 0) return [];
    const excludedKeys = ['_id', 'id', 'title', 'subtitle', 'description', 'image', 'category', 'status', 'color', 'createdAt', 'updatedAt', 'tableId', 'workspaceId'];
    const sample = data[0];
    return Object.keys(sample).filter(key => !key.startsWith('_') && !excludedKeys.includes(key)).slice(0, 4);
  }, [data]);

  const gridColsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800/50 to-slate-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
      {/* Toolbar mejorado */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-700/50 bg-slate-800/30">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{Icons.search}</span>
          <input
            type="text"
            placeholder="Buscar tarjetas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por categoría */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{Icons.tag}</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-700/50 text-slate-300 text-sm cursor-pointer focus:outline-none focus:border-indigo-500/50 hover:bg-slate-700/50 transition-colors"
              >
                <option value="all">Todas ({cards.length})</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat} ({stats.byCategory[cat] || 0})</option>
                ))}
              </select>
            </div>
          )}

          {/* Ordenamiento */}
          <div className="flex items-center gap-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-700/50 text-slate-300 text-sm cursor-pointer focus:outline-none focus:border-indigo-500/50 hover:bg-slate-700/50 transition-colors"
            >
              <option value="default">Sin ordenar</option>
              <option value="title">Título</option>
              <option value="category">Categoría</option>
              {additionalFields.slice(0, 2).map(f => (
                <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {sortBy !== 'default' && (
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-lg bg-slate-700/30 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              >
                {sortDir === 'asc' ? Icons.sortAsc : Icons.sortDesc}
              </button>
            )}
          </div>

          {/* Estadísticas */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-lg text-sm transition-all ${showStats ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/30 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
          >
            {Icons.stats}
          </button>

          <div className="w-px h-6 bg-slate-700/50" />

          {/* Grid size */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/30 border border-slate-700/50">
            {[2, 3, 4].map(cols => (
              <button
                key={cols}
                onClick={() => setGridCols(cols)}
                className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-all ${gridCols === cols ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              >
                {cols}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg bg-slate-700/30 border border-slate-700/50 p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>{Icons.grid}</button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>{Icons.list}</button>
          </div>
        </div>
      </div>

      {/* Panel de estadísticas */}
      {showStats && (
        <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/20">
          <div className="flex items-center gap-6 overflow-x-auto">
            <div className="flex-shrink-0">
              <div className="text-xs text-slate-500 mb-1">Total</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="w-px h-10 bg-slate-700/50" />
            {categories.slice(0, 5).map(cat => {
              const color = getColorForValue(cat);
              return (
                <div key={cat} className="flex-shrink-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color.bg }} />
                    {cat}
                  </div>
                  <div className="text-xl font-bold text-white">{stats.byCategory[cat]}</div>
                </div>
              );
            })}
            {stats.withImage > 0 && (
              <>
                <div className="w-px h-10 bg-slate-700/50" />
                <div className="flex-shrink-0">
                  <div className="text-xs text-slate-500 mb-1">Con imagen</div>
                  <div className="text-xl font-bold text-indigo-400">{stats.withImage}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cards Grid/List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <div className="w-16 h-16 mb-4 rounded-full bg-slate-700/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-300">No hay tarjetas</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchTerm || categoryFilter !== 'all' ? 'Prueba con otros filtros' : 'Agrega datos para verlos aquí'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className={`grid ${gridColsClass[gridCols]} gap-5`}>
            {filteredCards.map((card, index) => (
              <div
                key={card._id || index}
                onClick={() => setSelectedCard(card)}
                className="group relative bg-gradient-to-br from-slate-800/70 to-slate-800/40 rounded-2xl border border-slate-700/40 overflow-hidden cursor-pointer hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 hover:scale-[1.02] transition-all duration-300"
              >
                {/* Image */}
                {card._displayImage && (
                  <div className="h-44 overflow-hidden relative">
                    <img src={card._displayImage} alt={card._displayTitle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                  </div>
                )}

                {/* Content */}
                <div className="p-5">
                  {/* Category badge */}
                  {card._displayCategory && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg mb-3" style={{ backgroundColor: card._displayColor.light, color: card._displayColor.text }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: card._displayColor.bg }} />
                      {card._displayCategory}
                    </span>
                  )}
                  
                  {/* Title */}
                  <h3 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 text-lg">
                    {card._displayTitle}
                  </h3>
                  
                  {/* Subtitle */}
                  {card._displaySubtitle && (
                    <p className="text-sm text-slate-400 mt-1.5 line-clamp-1">{card._displaySubtitle}</p>
                  )}
                  
                  {/* Description */}
                  {card._displayDescription && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{card._displayDescription}</p>
                  )}

                  {/* Additional fields */}
                  {additionalFields.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-2">
                      {additionalFields.slice(0, 2).map(field => (
                        card[field] && (
                          <div key={field} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 capitalize">{field.replace(/_/g, ' ')}</span>
                            <span className="text-slate-300 truncate ml-2 max-w-[60%] font-medium">
                              {typeof card[field] === 'object' ? JSON.stringify(card[field]) : card[field]}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredCards.map((card, index) => (
              <div
                key={card._id || index}
                onClick={() => setSelectedCard(card)}
                className="group flex items-center gap-4 p-4 bg-gradient-to-r from-slate-800/60 to-slate-800/30 rounded-xl border border-slate-700/40 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-200"
              >
                {/* Image thumbnail */}
                {card._displayImage && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-700/30">
                    <img src={card._displayImage} alt={card._displayTitle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                      {card._displayTitle}
                    </h3>
                    {card._displayCategory && (
                      <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-md" style={{ backgroundColor: card._displayColor.light, color: card._displayColor.text }}>
                        {card._displayCategory}
                      </span>
                    )}
                  </div>
                  {card._displaySubtitle && (
                    <p className="text-sm text-slate-400 truncate mt-0.5">{card._displaySubtitle}</p>
                  )}
                  {card._displayDescription && (
                    <p className="text-sm text-slate-500 truncate mt-1">{card._displayDescription}</p>
                  )}
                </div>

                {/* Additional info */}
                <div className="hidden md:flex items-center gap-6 shrink-0">
                  {additionalFields.slice(0, 2).map(field => (
                    card[field] && (
                      <div key={field} className="text-right">
                        <p className="text-xs text-slate-500 capitalize">{field.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-slate-300 truncate max-w-[120px] font-medium">
                          {typeof card[field] === 'object' ? JSON.stringify(card[field]) : card[field]}
                        </p>
                      </div>
                    )
                  ))}
                </div>

                {/* Arrow icon */}
                <span className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal mejorado */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCard(null)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-auto bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header con imagen */}
            {selectedCard._displayImage && (
              <div className="relative h-52">
                <img src={selectedCard._displayImage} alt={selectedCard._displayTitle} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                <button onClick={() => setSelectedCard(null)} className="absolute top-4 right-4 p-2 rounded-lg bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors">
                  {Icons.x}
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Header sin imagen */}
              {!selectedCard._displayImage && (
                <div className="flex items-start justify-between">
                  <div className="flex-1" />
                  <button onClick={() => setSelectedCard(null)} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
                    {Icons.x}
                  </button>
                </div>
              )}

              {/* Category */}
              {selectedCard._displayCategory && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg" style={{ backgroundColor: selectedCard._displayColor.light, color: selectedCard._displayColor.text }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCard._displayColor.bg }} />
                  {selectedCard._displayCategory}
                </span>
              )}

              {/* Title */}
              <h2 className="text-2xl font-bold text-white">{selectedCard._displayTitle}</h2>

              {/* Subtitle */}
              {selectedCard._displaySubtitle && (
                <p className="text-lg text-slate-300">{selectedCard._displaySubtitle}</p>
              )}

              {/* Description */}
              {selectedCard._displayDescription && (
                <p className="text-slate-400 leading-relaxed">{selectedCard._displayDescription}</p>
              )}

              {/* All fields */}
              <div className="pt-5 border-t border-slate-700/50 space-y-4">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Todos los campos</h3>
                {Object.entries(selectedCard)
                  .filter(([key]) => !key.startsWith('_') && key !== 'id')
                  .map(([key, value]) => (
                    <div key={key} className="p-3 rounded-xl bg-slate-700/20 hover:bg-slate-700/30 transition-colors">
                      <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">{key.replace(/_/g, ' ')}</span>
                      <span className="text-slate-200 break-words">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || '-')}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
              <button onClick={() => setSelectedCard(null)} className="w-full py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm font-medium transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
