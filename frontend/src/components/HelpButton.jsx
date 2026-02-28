/**
 * HelpButton - Botón flotante de ayuda para iniciar tours
 * 
 * Aparece en todas las páginas y permite al usuario ver el tour
 * de la página actual en cualquier momento.
 */

import React, { useState } from 'react';
import { useTourContext } from '../context/TourContext';

export function HelpButton() {
  const { startPageTour, startGlobalTour, resetAllTours, isTourActive } = useTourContext();
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = () => {
    if (isTourActive) return;
    setShowMenu(!showMenu);
  };

  const handleStartPageTour = () => {
    setShowMenu(false);
    startPageTour(true); // true = forzar inicio aunque ya se haya visto
  };

  const handleStartGlobalTour = () => {
    setShowMenu(false);
    startGlobalTour();
  };

  const handleResetTours = () => {
    setShowMenu(false);
    resetAllTours();
  };

  if (isTourActive) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50" data-tour="help-button">
      {/* Menú de opciones */}
      {showMenu && (
        <div 
          className="absolute bottom-16 right-0 w-64 rounded-xl overflow-hidden shadow-2xl"
          style={{ 
            background: 'linear-gradient(135deg, rgba(30, 30, 40, 0.98), rgba(20, 20, 30, 0.98))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="p-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">¿Necesitas ayuda?</h3>
            <p className="text-xs text-slate-400 mt-1">Elige una opción para aprender</p>
          </div>
          
          <div className="p-2">
            <button
              onClick={handleStartPageTour}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-colors group"
            >
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/30 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <span className="text-sm font-medium text-white">Tour de esta página</span>
                <p className="text-xs text-slate-400">Aprende cómo usar esta sección</p>
              </div>
            </button>

            <button
              onClick={handleStartGlobalTour}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-colors group"
            >
              <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/30 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </span>
              <div>
                <span className="text-sm font-medium text-white">Tour completo</span>
                <p className="text-xs text-slate-400">Recorrido general de FlowAI</p>
              </div>
            </button>

            <div className="border-t border-white/10 mt-2 pt-2">
              <button
                onClick={handleResetTours}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-colors group"
              >
                <span className="w-6 h-6 rounded flex items-center justify-center text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </span>
                <span className="text-xs text-slate-400">Reiniciar todos los tours</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón principal */}
      <button
        onClick={handleClick}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          shadow-lg transition-all duration-300
          hover:scale-110 active:scale-95
          ${showMenu ? 'rotate-45' : ''}
        `}
        style={{ 
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
        }}
        title="Ayuda"
      >
        {showMenu ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>

      {/* Overlay para cerrar el menú */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-[-1]" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

export default HelpButton;
