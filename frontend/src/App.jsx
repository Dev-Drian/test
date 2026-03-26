import React, { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { WorkspaceContext } from "./context/WorkspaceContext";
import { useWorkspace } from "./context/WorkspaceContext";
import { SocketProvider } from "./context/SocketContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TourProvider } from "./context/TourContext";
import { ToastProvider } from "./components/Toast";
import { FullPageSpinner } from "./components/Spinner";
import Layout from "./components/Layout";
import WidgetEmbed from "./pages/WidgetEmbed";
import { listWorkspaces } from "./api/client";

// ═══ LAZY LOADING DE PÁGINAS ═══
// Mejora la carga inicial dividiendo el bundle
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Workspaces = lazy(() => import("./pages/Workspaces"));
const Agents = lazy(() => import("./pages/Agents"));
const Tables = lazy(() => import("./pages/Tables"));
const Chat = lazy(() => import("./pages/Chat"));
const Guia = lazy(() => import("./pages/Guia"));
const FlowEditor = lazy(() => import("./pages/FlowEditor"));
const Views = lazy(() => import("./pages/Views"));
const Flows = lazy(() => import("./pages/Flows"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Login = lazy(() => import("./pages/Login"));
const Landing = lazy(() => import("./pages/Landing"));
const Admin = lazy(() => import("./pages/Admin"));
const OnboardingWizard = lazy(() => import("./components/OnboardingWizard"));
const AuthTransition = lazy(() => import("./components/AuthTransition"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const AdvancedFeatures = lazy(() => import("./pages/AdvancedFeatures"));

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
    return <FullPageSpinner message="Verificando sesión..." />;
  }
  
  // Si no está autenticado: mostrar Landing en "/", login en el resto
  if (!isAuthenticated) {
    return location.pathname === "/" ? <Landing /> : <Navigate to="/login" replace />;
  }
  
  // Mientras verifica workspaces, mostrar loader
  if (checkingWorkspaces) {
    return <FullPageSpinner message="Cargando workspace..." />;
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
    return <FullPageSpinner />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Login />
    </Suspense>
  );
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

  // Auto-seleccionar el primer workspace si no hay ninguno seleccionado
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    // Si ya hay un workspace seleccionado, no hacer nada
    if (selectedWorkspaceId) return;
    
    listWorkspaces()
      .then((res) => {
        const workspaces = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (workspaces.length > 0) {
          const first = workspaces[0];
          setSelectedWorkspaceId(first._id);
          setSelectedWorkspaceName(first.name || "");
          localStorage.setItem("migracion_workspace_id", first._id);
          localStorage.setItem("migracion_workspace_name", first.name || "");
        }
      })
      .catch((err) => {
        console.error("Error auto-seleccionando workspace:", err);
      });
  }, [isAuthenticated, user, selectedWorkspaceId]);

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
            <Suspense fallback={<FullPageSpinner />}>
              <AuthTransition 
                type={authTransition.type} 
                userName={user?.name || authTransition.userName}
                onComplete={authTransition.onComplete}
              />
            </Suspense>
          )}
          <Suspense fallback={<FullPageSpinner />}>
            <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/widget/embed" element={<WidgetEmbed />} />
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
              <Route path="advanced" element={<AdvancedFeatures />} />
              <Route path="admin" element={<Admin />} />
              <Route path="upgrade" element={<Upgrade />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </Suspense>
        </TourProvider>
      </SocketBridge>
    </WorkspaceContext.Provider>
  );
}

export default App;
