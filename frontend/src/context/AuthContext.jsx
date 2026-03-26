import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as apiLogin, register as apiRegister, getProfile } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Empezar como null, no desde localStorage
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authTransition, setAuthTransition] = useState(null); // { type: 'login' | 'logout', message?: string }

  // Verificar token al cargar
  useEffect(() => {
    const token = localStorage.getItem("migracion_token");
    if (!token) {
      // Sin token = sin autenticación
      localStorage.removeItem("migracion_user");
      setLoading(false);
      return;
    }
    
    // Hay token, verificar que sea válido
    getProfile()
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem("migracion_user", JSON.stringify(res.data.user));
      })
      .catch(() => {
        // Token inválido, limpiar todo
        localStorage.removeItem("migracion_token");
        localStorage.removeItem("migracion_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Listen for 401 session-expired events from API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await apiLogin(email, password);
      const { token, user } = res.data;
      localStorage.setItem("migracion_token", token);
      localStorage.setItem("migracion_user", JSON.stringify(user));
      
      // Mostrar transición con callback
      return new Promise((resolve) => {
        setAuthTransition({ 
          type: 'login', 
          userName: user.name || user.email,
          onComplete: () => {
            setUser(user);
            setAuthTransition(null);
            resolve({ success: true });
          }
        });
      });
    } catch (err) {
      const message = err.response?.data?.error || "Error al iniciar sesión";
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (data) => {
    setError(null);
    try {
      const res = await apiRegister(data);
      const { token, user } = res.data;
      localStorage.setItem("migracion_token", token);
      localStorage.setItem("migracion_user", JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || "Error al registrarse";
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    const userName = user?.name || '';
    return new Promise((resolve) => {
      setAuthTransition({ 
        type: 'logout', 
        userName,
        onComplete: () => {
          localStorage.removeItem("migracion_token");
          localStorage.removeItem("migracion_user");
          localStorage.removeItem("migracion_workspace_id");
          localStorage.removeItem("migracion_workspace_name");
          setUser(null);
          setAuthTransition(null);
          resolve();
        }
      });
    });
  }, [user]);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem("migracion_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Recargar usuario desde el servidor (útil después de cambios de plan)
  const refreshUser = useCallback(async () => {
    try {
      const res = await getProfile();
      setUser(res.data.user);
      localStorage.setItem("migracion_user", JSON.stringify(res.data.user));
      return res.data.user;
    } catch (err) {
      console.error('Error refreshing user:', err);
      return null;
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    authTransition,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
