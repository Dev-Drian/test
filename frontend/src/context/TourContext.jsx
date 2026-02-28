/**
 * TourProvider - Contexto global para tours de onboarding
 * 
 * Proporciona funcionalidad de tours guiados en toda la aplicación.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import introJs from 'intro.js';
import { getTourByRoute, globalTourSteps } from '../config/tourConfig';

// Key de localStorage para guardar el progreso de tours
const TOURS_COMPLETED_KEY = 'flowai_tours_completed';
const GLOBAL_TOUR_SHOWN_KEY = 'flowai_global_tour_shown';

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const location = useLocation();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTourId, setCurrentTourId] = useState(null);
  
  // Verificar si el tour ya fue completado
  const isTourCompleted = useCallback((tourId) => {
    try {
      const completed = JSON.parse(localStorage.getItem(TOURS_COMPLETED_KEY) || '{}');
      return completed[tourId] === true;
    } catch {
      return false;
    }
  }, []);

  // Marcar tour como completado
  const markTourCompleted = useCallback((tourId) => {
    try {
      const completed = JSON.parse(localStorage.getItem(TOURS_COMPLETED_KEY) || '{}');
      completed[tourId] = true;
      localStorage.setItem(TOURS_COMPLETED_KEY, JSON.stringify(completed));
    } catch (e) {
      console.error('Error saving tour completion:', e);
    }
  }, []);

  // Verificar si es el primer login (para tour global)
  const isFirstVisit = useCallback(() => {
    return localStorage.getItem(GLOBAL_TOUR_SHOWN_KEY) !== 'true';
  }, []);

  // Marcar que ya se mostró el tour global
  const markGlobalTourShown = useCallback(() => {
    localStorage.setItem(GLOBAL_TOUR_SHOWN_KEY, 'true');
  }, []);

  // Iniciar tour de la página actual
  const startPageTour = useCallback((forceStart = false) => {
    const { id, steps } = getTourByRoute(location.pathname);
    
    if (!forceStart && isTourCompleted(id)) {
      return false;
    }

    if (steps.length === 0) {
      console.warn(`No tour steps defined for ${location.pathname}`);
      return false;
    }

    // Filtrar solo los pasos que tienen elementos existentes en el DOM
    const validSteps = steps.filter(step => {
      if (!step.element) return true; // Pasos sin elemento (intros generales)
      return document.querySelector(step.element) !== null;
    });

    if (validSteps.length === 0) {
      console.warn(`No valid tour steps found for ${location.pathname}`);
      return false;
    }

    setTimeout(() => {
      const intro = introJs();
      
      intro.setOptions({
        steps: validSteps.map(step => ({
          element: step.element ? document.querySelector(step.element) : undefined,
          intro: step.intro,
          title: step.title,
          position: step.position || 'bottom',
        })),
        showProgress: true,
        showBullets: true,
        exitOnOverlayClick: true,
        exitOnEsc: true,
        scrollToElement: true,
        disableInteraction: false,
        nextLabel: 'Siguiente',
        prevLabel: 'Anterior',
        skipLabel: 'Omitir',
        doneLabel: '¡Entendido!',
        hidePrev: true,
        hideNext: false,
        overlayOpacity: 0.75,
        tooltipPosition: 'auto',
      });

      intro.oncomplete(() => {
        markTourCompleted(id);
        setIsTourActive(false);
        setCurrentTourId(null);
      });

      intro.onexit(() => {
        setIsTourActive(false);
        setCurrentTourId(null);
      });

      setIsTourActive(true);
      setCurrentTourId(id);
      intro.start();
    }, 400);

    return true;
  }, [location.pathname, isTourCompleted, markTourCompleted]);

  // Iniciar tour global (primera vez)
  const startGlobalTour = useCallback(() => {
    // Filtrar solo los pasos que tienen elementos existentes
    const validSteps = globalTourSteps.filter(step => {
      if (!step.element) return true;
      return document.querySelector(step.element) !== null;
    });

    if (validSteps.length === 0) return false;

    setTimeout(() => {
      const intro = introJs();
      
      intro.setOptions({
        steps: validSteps.map(step => ({
          element: step.element ? document.querySelector(step.element) : undefined,
          intro: step.intro,
          title: step.title,
          position: step.position || 'bottom',
        })),
        showProgress: true,
        showBullets: true,
        exitOnOverlayClick: true,
        exitOnEsc: true,
        scrollToElement: true,
        nextLabel: 'Siguiente →',
        prevLabel: '← Anterior',
        skipLabel: 'Omitir tour',
        doneLabel: '¡Comenzar!',
        hidePrev: true,
        overlayOpacity: 0.8,
      });

      intro.oncomplete(() => {
        markGlobalTourShown();
        markTourCompleted('global');
        setIsTourActive(false);
      });

      intro.onexit(() => {
        markGlobalTourShown();
        setIsTourActive(false);
      });

      setIsTourActive(true);
      setCurrentTourId('global');
      intro.start();
    }, 800);

    return true;
  }, [markGlobalTourShown, markTourCompleted]);

  // Resetear un tour específico
  const resetTour = useCallback((tourId) => {
    try {
      const completed = JSON.parse(localStorage.getItem(TOURS_COMPLETED_KEY) || '{}');
      delete completed[tourId];
      localStorage.setItem(TOURS_COMPLETED_KEY, JSON.stringify(completed));
    } catch (e) {
      console.error('Error resetting tour:', e);
    }
  }, []);

  // Resetear todos los tours
  const resetAllTours = useCallback(() => {
    localStorage.removeItem(TOURS_COMPLETED_KEY);
    localStorage.removeItem(GLOBAL_TOUR_SHOWN_KEY);
  }, []);

  // Auto-iniciar tour de la página para usuarios nuevos (solo 1 vez por página)
  useEffect(() => {
    // Esperar a que la página cargue completamente
    const timer = setTimeout(() => {
      const { id, steps } = getTourByRoute(location.pathname);
      
      // Verificar si ya se completó este tour
      try {
        const completed = JSON.parse(localStorage.getItem(TOURS_COMPLETED_KEY) || '{}');
        if (completed[id]) return;
      } catch {
        return;
      }

      // Filtrar pasos válidos
      const validSteps = steps.filter(step => {
        if (!step.element) return true;
        return document.querySelector(step.element) !== null;
      });

      if (validSteps.length === 0) return;

      // Iniciar el tour
      const intro = introJs();
      
      intro.setOptions({
        steps: validSteps.map(step => ({
          element: step.element ? document.querySelector(step.element) : undefined,
          intro: step.intro,
          title: step.title,
          position: step.position || 'bottom',
        })),
        showProgress: true,
        showBullets: true,
        exitOnOverlayClick: true,
        exitOnEsc: true,
        scrollToElement: true,
        disableInteraction: false,
        nextLabel: 'Siguiente →',
        prevLabel: '← Anterior',
        skipLabel: 'Omitir',
        doneLabel: '¡Entendido!',
        hidePrev: true,
        hideNext: false,
        overlayOpacity: 0.75,
      });

      intro.oncomplete(() => {
        try {
          const completed = JSON.parse(localStorage.getItem(TOURS_COMPLETED_KEY) || '{}');
          completed[id] = true;
          localStorage.setItem(TOURS_COMPLETED_KEY, JSON.stringify(completed));
        } catch {}
        setIsTourActive(false);
        setCurrentTourId(null);
      });

      intro.onexit(() => {
        // Marcar como completado aunque se salte
        try {
          const completed = JSON.parse(localStorage.getItem(TOURS_COMPLETED_KEY) || '{}');
          completed[id] = true;
          localStorage.setItem(TOURS_COMPLETED_KEY, JSON.stringify(completed));
        } catch {}
        setIsTourActive(false);
        setCurrentTourId(null);
      });

      setIsTourActive(true);
      setCurrentTourId(id);
      intro.start();
    }, 1200);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const value = {
    isTourActive,
    currentTourId,
    startPageTour,
    startGlobalTour,
    isTourCompleted,
    isFirstVisit,
    resetTour,
    resetAllTours,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}

// Hook para usar el contexto
export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTourContext must be used within a TourProvider');
  }
  return context;
}

export default TourProvider;
