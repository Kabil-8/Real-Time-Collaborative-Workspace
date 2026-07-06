import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./hooks/useToast";
import ToastContainer from "./components/ui/Toast";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import AppShell from "./components/layout/AppShell";
import HomePage from "./pages/HomePage";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import MembersPage from "./pages/MembersPage";
import BoardPage from "./pages/BoardPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import SearchPage from "./pages/SearchPage";
import NotificationsPage from "./pages/NotificationsPage";
import { NotificationProvider } from "./context/NotificationContext";

// ─── Branded loading screen ───────────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
    {/* Ambient orbs */}
    <div className="orb orb-violet w-96 h-96 top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2" />
    <div className="orb orb-indigo w-72 h-72 bottom-1/4 right-1/4" />
    <div className="flex flex-col items-center gap-5 relative z-10 animate-scale-in">
      {/* Logo mark */}
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600
          flex items-center justify-center text-white font-black text-2xl
          shadow-lg shadow-violet-500/40 glow-violet-sm">
          Z
        </div>
        {/* Spinning ring */}
        <div className="absolute -inset-2 rounded-full border-2 border-transparent
          border-t-violet-500 border-r-indigo-500 animate-spin opacity-60" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg tracking-tight">Zaalima</p>
        <p className="text-slate-500 text-sm mt-0.5 animate-pulse-dot">Loading your workspace…</p>
      </div>
    </div>
  </div>
);

// Route guard: redirects to /login if not authenticated
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

// Route guard: redirects to / if already authenticated
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/" replace />;
};

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

    {/* Accept invite — requires auth but not workspace membership yet */}
    <Route path="/invite/:token" element={<PrivateRoute><AcceptInvitePage /></PrivateRoute>} />

    {/* Protected — wrapped in AppShell */}
    <Route path="/" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <NotificationProvider>
            <AppShell><HomePage /></AppShell>
          </NotificationProvider>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    <Route path="/boards" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <NotificationProvider>
            <AppShell><HomePage /></AppShell>
          </NotificationProvider>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    <Route path="/search" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <NotificationProvider>
            <AppShell><SearchPage /></AppShell>
          </NotificationProvider>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    <Route path="/notifications" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <NotificationProvider>
            <AppShell><NotificationsPage /></AppShell>
          </NotificationProvider>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    <Route path="/boards/:boardId" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <NotificationProvider>
            <AppShell><BoardPage /></AppShell>
          </NotificationProvider>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    <Route path="/workspace/:workspaceId/settings" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <NotificationProvider>
            <AppShell><WorkspaceSettings /></AppShell>
          </NotificationProvider>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    <Route path="/workspace/:workspaceId/members" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <NotificationProvider>
            <AppShell><MembersPage /></AppShell>
          </NotificationProvider>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <ThemeProvider>
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      {/* Global toast overlay — rendered once outside router */}
      <ToastContainer />
    </ToastProvider>
  </ThemeProvider>
);

export default App;
