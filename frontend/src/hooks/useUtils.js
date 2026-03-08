/**
 * Hooks de utilidad reutilizables
 * 
 * Incluye:
 * - useDebounce: Debounce de valores
 * - useDebouncedCallback: Debounce de funciones
 * - useAsyncAction: Manejo de acciones async con loading/error
 * - useLocalStorage: Persistencia en localStorage
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useDebounce - Retrasa la actualización de un valor
 * 
 * @param {any} value - Valor a debouncer
 * @param {number} delay - Milisegundos de espera (default: 300)
 * @returns {any} Valor debounceado
 * 
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 500);
 * 
 * useEffect(() => {
 *   if (debouncedSearch) fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Crea una función debounceada
 * 
 * @param {Function} callback - Función a debouncer
 * @param {number} delay - Milisegundos de espera
 * @returns {Function} Función debounceada
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback((term) => {
 *   fetchResults(term);
 * }, 500);
 * 
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);
  
  // Actualizar ref cuando cambia el callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

/**
 * useAsyncAction - Manejo de acciones asíncronas
 * 
 * @param {Function} action - Función async a ejecutar
 * @param {Object} options - Opciones
 * @param {Function} options.onSuccess - Callback en éxito
 * @param {Function} options.onError - Callback en error
 * @param {boolean} options.resetErrorOnExecute - Limpiar error al ejecutar (default: true)
 * @returns {{ execute, loading, error, data, reset }}
 * 
 * @example
 * const { execute, loading, error, data } = useAsyncAction(
 *   () => api.createItem(form),
 *   { 
 *     onSuccess: (result) => toast.success('Creado!'),
 *     onError: (err) => toast.error(err.message)
 *   }
 * );
 * 
 * <button onClick={execute} disabled={loading}>
 *   {loading ? 'Creando...' : 'Crear'}
 * </button>
 */
export function useAsyncAction(action, options = {}) {
  const { 
    onSuccess, 
    onError, 
    resetErrorOnExecute = true 
  } = options;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    if (resetErrorOnExecute) setError(null);
    setLoading(true);
    
    try {
      const result = await action(...args);
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        onSuccess?.(result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        const errorMsg = err.response?.data?.error || err.message || 'Error desconocido';
        setError(errorMsg);
        setLoading(false);
        onError?.(err, errorMsg);
      }
      throw err;
    }
  }, [action, onSuccess, onError, resetErrorOnExecute]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, loading, error, data, reset };
}

/**
 * useLocalStorage - Estado sincronizado con localStorage
 * 
 * @param {string} key - Clave de localStorage
 * @param {any} initialValue - Valor inicial si no existe
 * @returns {[value, setValue, removeValue]}
 * 
 * @example
 * const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'dark');
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * usePrevious - Obtiene el valor previo de una variable
 * 
 * @param {any} value - Valor a trackear
 * @returns {any} Valor anterior
 */
export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
