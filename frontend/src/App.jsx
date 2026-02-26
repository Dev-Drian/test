import React, { useState, useMemo, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { WorkspaceContext } from "./context/WorkspaceContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import Agents from "./pages/Agents";
import Tables from "./pages/Tables";
import Chat from "./pages/Chat";
import Guia from "./pages/Guia";
import FlowEditor from "./pages/FlowEditor";
import Login from "./pages/Login";
import OnboardingWizard from "./components/OnboardingWizard";
import { listWorkspaces } from "./api/client";

export { WorkspaceContext };

// Componente para rutas protegidas con onboarding
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const [checkingWorkspaces, setCheckingWorkspaces] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Key de localStorage única por usuario
  const onboardingKey = user?._id ? `migracion_onboarding_${user._id}` : null;
  
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  
  // Actualizar estado cuando cambia el usuario
  useEffect(() => {
    if (onboardingKey) {
      setHasCompletedOnboarding(localStorage.getItem(onboardingKey) === "true");
    }
  }, [onboardingKey]);
  
  // Verificar si tiene workspaces (solo una vez después de auth)
  useEffect(() => {
    // Si está cargando auth, esperar
    if (loading) return;
    
    // Si NO está autenticado, no verificar workspaces (irá a login)
    if (!isAuthenticated || !user) {
      setCheckingWorkspaces(false);
      return;
    }
    
    // Si ya completó onboarding (según localStorage por usuario), no verificar
    if (localStorage.getItem(onboardingKey) === "true") {
      setCheckingWorkspaces(false);
      return;
    }
    
    // También verificar el campo del usuario en BD
    if (user.onboardingCompleted) {
      localStorage.setItem(onboardingKey, "true"); // Sincronizar
      setCheckingWorkspaces(false);
      return;
    }
    
    listWorkspaces()
      .then((res) => {
        // res.data puede ser array directo o dentro de data según el formato
        const workspaces = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        
        // Si tiene workspaces, marcar onboarding como completado
        if (workspaces.length > 0) {
          localStorage.setItem(onboardingKey, "true");
          setHasCompletedOnboarding(true);
        } else {
          // No tiene workspaces, mostrar onboarding
          setShowOnboarding(true);
        }
      })
      .catch((err) => {
        console.error('Error verificando workspaces:', err);
        // En caso de error, no mostrar onboarding
      })
      .finally(() => setCheckingWorkspaces(false));
  }, [isAuthenticated, loading, user, onboardingKey]);
  
  // Mientras carga auth, mostrar loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Mientras verifica workspaces, mostrar loader
  if (checkingWorkspaces) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Mostrar wizard de onboarding si es necesario
  if (showOnboarding) {
    return (
      <OnboardingWizard 
        onComplete={() => {
          if (onboardingKey) localStorage.setItem(onboardingKey, "true");
          setHasCompletedOnboarding(true);
          setShowOnboarding(false);
        }}
        onSkip={() => {
          if (onboardingKey) localStorage.setItem(onboardingKey, "true");
          setHasCompletedOnboarding(true);
          setShowOnboarding(false);
        }}
      />
    );
  }
  
  return children;
}

// Componente para ruta de login (redirige si ya está logueado)
function LoginRoute() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <Login />;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() =>
    localStorage.getItem("migracion_workspace_id") || ""
  );
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState(() =>
    localStorage.getItem("migracion_workspace_name") || ""
  );

  // Limpiar workspace cuando el usuario cambia o cierra sesión
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Si no hay usuario autenticado, limpiar workspace
      setSelectedWorkspaceId("");
      setSelectedWorkspaceName("");
    }
  }, [isAuthenticated, user]);

  const workspaceContext = useMemo(
    () => ({
      workspaceId: selectedWorkspaceId || null,
      workspaceName: selectedWorkspaceName || null,
      setWorkspace: (id, name = "") => {
        setSelectedWorkspaceId(id || "");
        setSelectedWorkspaceName(name || "");
        if (id) {
          localStorage.setItem("migracion_workspace_id", id);
          localStorage.setItem("migracion_workspace_name", name || "");
        } else {
          localStorage.removeItem("migracion_workspace_id");
          localStorage.removeItem("migracion_workspace_name");
        }
      },
    }),
    [selectedWorkspaceId, selectedWorkspaceName]
  );

  return (
    <WorkspaceContext.Provider value={workspaceContext}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="workspaces" element={<Workspaces />} />
          <Route path="agents" element={<Agents />} />
          <Route path="tables" element={<Tables />} />
          <Route path="flows" element={<FlowEditor />} />
          <Route path="chat" element={<Chat />} />
          <Route path="guia" element={<Guia />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </WorkspaceContext.Provider>
  );
}

export default App;
