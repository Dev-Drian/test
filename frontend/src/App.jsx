import React, { useState, useMemo, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { WorkspaceContext } from "./context/WorkspaceContext";
import { useWorkspace } from "./context/WorkspaceContext";
import { SocketProvider } from "./context/SocketContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TourProvider } from "./context/TourContext";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import Agents from "./pages/Agents";
import Tables from "./pages/Tables";
import Chat from "./pages/Chat";
import Guia from "./pages/Guia";
import FlowEditor from "./pages/FlowEditor";
import Views from "./pages/Views";
import Flows from "./pages/Flows";
import Integrations from "./pages/Integrations";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Admin from "./pages/Admin";
import OnboardingWizard from "./components/OnboardingWizard";
import AuthTransition from "./components/AuthTransition";
import Upgrade from "./pages/Upgrade";
import ForgotPassword from "./pages/ForgotPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import { listWorkspaces } from "./api/client";

export { WorkspaceContext };

// Componente para rutas protegidas con onboarding
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const [checkingWorkspaces, setCheckingWorkspaces] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Key de localStorage única por usuario
  const onboardingKey = user?._id ? `migracion_onboarding_${user._id}` : null;
  
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Rutas que NO requieren onboarding completado
  const bypassOnboardingRoutes = ['/upgrade'];
  const shouldBypassOnboarding = bypassOnboardingRoutes.some(r => location.pathname.startsWith(r));
  
  // Verificar si hay un plan pendiente de pago
  const hasPendingPlan = localStorage.getItem('pending_plan');
  
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

    // Si hay plan pendiente o estamos en ruta de bypass, no verificar onboarding
    if (hasPendingPlan || shouldBypassOnboarding) {
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
  }, [isAuthenticated, loading, user, onboardingKey, hasPendingPlan, shouldBypassOnboarding]);
  
  // Mientras carga auth, mostrar loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Si no está autenticado: mostrar Landing en "/", login en el resto
  if (!isAuthenticated) {
    return location.pathname === "/" ? <Landing /> : <Navigate to="/login" replace />;
  }
  
  // Mientras verifica workspaces, mostrar loader
  if (checkingWorkspaces) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Mostrar wizard de onboarding si es necesario (pero no en rutas de bypass)
  if (showOnboarding && !shouldBypassOnboarding && !hasPendingPlan) {
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

// Puente: lee workspaceId del contexto y lo pasa al SocketProvider
function SocketBridge({ children }) {
  const { workspaceId } = useWorkspace();
  return <SocketProvider workspaceId={workspaceId}>{children}</SocketProvider>;
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
  const { user, isAuthenticated, authTransition } = useAuth();
  
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
      <SocketBridge>
        <TourProvider>
          {/* Auth Transition Overlay */}
          {authTransition && (
            <AuthTransition 
              type={authTransition.type} 
              userName={user?.name || authTransition.userName}
              onComplete={authTransition.onComplete}
            />
          )}
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="workspaces" element={<Workspaces />} />
              <Route path="agents" element={<Agents />} />
              <Route path="tables" element={<Tables />} />
              <Route path="views" element={<Views />} />
              <Route path="flows" element={<Flows />} />
              <Route path="flows/editor" element={<FlowEditor />} />
              <Route path="flows/editor/:flowId" element={<FlowEditor />} />
              <Route path="chat" element={<Chat />} />
              <Route path="guia" element={<Guia />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="admin" element={<Admin />} />
              <Route path="upgrade" element={<Upgrade />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </TourProvider>
      </SocketBridge>
    </WorkspaceContext.Provider>
  );
}

export default App;
