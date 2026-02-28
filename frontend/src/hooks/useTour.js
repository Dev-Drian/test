/**
 * useTour - Hook para manejar tours guiados con Intro.js
 * 
 * Proporciona funcionalidad para crear tours interactivos que guían
 * a usuarios nuevos por la interfaz de la aplicación.
 */

import { useCallback, useEffect, useRef } from 'react';
import introJs from 'intro.js';

// Key de localStorage para guardar el progreso de tours
const TOURS_COMPLETED_KEY = 'flowai_tours_completed';

/**
 * Hook para manejar tours guiados
 * @param {string} tourId - Identificador único del tour
 * @param {Array} steps - Pasos del tour
 * @param {Object} options - Opciones adicionales
 * @returns {Object} - Funciones para controlar el tour
 */
export function useTour(tourId, steps = [], options = {}) {
  const introRef = useRef(null);
  
  const {
    autoStart = false,
    showProgress = true,
    showBullets = true,
    exitOnOverlayClick = true,
    exitOnEsc = true,
    scrollToElement = true,
    disableInteraction = false,
    onComplete = () => {},
    onExit = () => {},
    onBeforeChange = () => {},
    onAfterChange = () => {},
  } = options;

  // Verificar si el tour ya fue completado
  const isTourCompleted = useCallback(() => {
    try {
      const completed = JSON.parse(localStorage.getItem(TOURS_COMPLETED_KEY) || '{}');
      return completed[tourId] === true;
    } catch {
      return false;
    }
  }, [tourId]);

  // Marcar tour como completado
  const markTourCompleted = useCallback(() => {
    try {
      const completed = JSON.parse(localStorage.getItem(TOURS_COMPLETED_KEY) || '{}');
      completed[tourId] = true;
      localStorage.setItem(TOURS_COMPLETED_KEY, JSON.stringify(completed));
    } catch (e) {
      console.error('Error saving tour completion:', e);
    }
  }, [tourId]);

  // Resetear tour (para permitir verlo de nuevo)
  const resetTour = useCallback(() => {
    try {
      const completed = JSON.parse(localStorage.getItem(TOURS_COMPLETED_KEY) || '{}');
      delete completed[tourId];
      localStorage.setItem(TOURS_COMPLETED_KEY, JSON.stringify(completed));
    } catch (e) {
      console.error('Error resetting tour:', e);
    }
  }, [tourId]);

  // Iniciar tour
  const startTour = useCallback((forceStart = false) => {
    if (!forceStart && isTourCompleted()) {
      return false;
    }

    if (steps.length === 0) {
      console.warn(`Tour "${tourId}" has no steps defined`);
      return false;
    }

    // Pequeño delay para asegurar que los elementos estén renderizados
    setTimeout(() => {
      const intro = introJs();
      introRef.current = intro;

      intro.setOptions({
        steps: steps.map(step => ({
          element: step.element,
          intro: step.intro,
          title: step.title,
          position: step.position || 'bottom',
          tooltipClass: step.tooltipClass || '',
          highlightClass: step.highlightClass || '',
        })),
        showProgress,
        showBullets,
        exitOnOverlayClick,
        exitOnEsc,
        scrollToElement,
        disableInteraction,
        nextLabel: 'Siguiente',
        prevLabel: 'Anterior',
        skipLabel: 'Saltar',
        doneLabel: '¡Entendido!',
        hidePrev: true,
        hideNext: false,
        overlayOpacity: 0.7,
        tooltipPosition: 'auto',
        positionPrecedence: ['bottom', 'top', 'right', 'left'],
      });

      intro.oncomplete(() => {
        markTourCompleted();
        onComplete();
      });

      intro.onexit(() => {
        onExit();
      });

      intro.onbeforechange((targetElement) => {
        onBeforeChange(targetElement);
      });

      intro.onafterchange((targetElement) => {
        onAfterChange(targetElement);
      });

      intro.start();
    }, 300);

    return true;
  }, [steps, tourId, isTourCompleted, markTourCompleted, showProgress, showBullets, 
      exitOnOverlayClick, exitOnEsc, scrollToElement, disableInteraction,
      onComplete, onExit, onBeforeChange, onAfterChange]);

  // Salir del tour
  const exitTour = useCallback(() => {
    if (introRef.current) {
      introRef.current.exit(true);
    }
  }, []);

  // Ir a un paso específico
  const goToStep = useCallback((stepNumber) => {
    if (introRef.current) {
      introRef.current.goToStep(stepNumber);
    }
  }, []);

  // Siguiente paso
  const nextStep = useCallback(() => {
    if (introRef.current) {
      introRef.current.nextStep();
    }
  }, []);

  // Paso anterior
  const previousStep = useCallback(() => {
    if (introRef.current) {
      introRef.current.previousStep();
    }
  }, []);

  // Auto-start si está habilitado
  useEffect(() => {
    if (autoStart && steps.length > 0) {
      startTour();
    }
    
    // Cleanup
    return () => {
      if (introRef.current) {
        introRef.current.exit(true);
      }
    };
  }, [autoStart, steps.length]); // No incluir startTour para evitar loop

  return {
    startTour,
    exitTour,
    goToStep,
    nextStep,
    previousStep,
    resetTour,
    isTourCompleted,
  };
}

/**
 * Resetear todos los tours (útil para testing)
 */
export function resetAllTours() {
  localStorage.removeItem(TOURS_COMPLETED_KEY);
}

/**
 * Obtener estado de todos los tours
 */
export function getToursStatus() {
  try {
    return JSON.parse(localStorage.getItem(TOURS_COMPLETED_KEY) || '{}');
  } catch {
    return {};
  }
}

export default useTour;
