import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import AppShell from "./components/layout/AppShell";
import HomePage from "./pages/HomePage";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import MembersPage from "./pages/MembersPage";
import BoardPage from "./pages/BoardPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";

// Route guard: redirects to /login if not authenticated
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
            flex items-center justify-center text-white font-bold text-lg animate-pulse">
            Z
          </div>
          <p className="text-slate-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

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
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

    {/* Accept invite — requires auth but not workspace membership yet */}
    <Route path="/invite/:token" element={<PrivateRoute><AcceptInvitePage /></PrivateRoute>} />

    {/* Protected — wrapped in AppShell */}
    <Route path="/" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <AppShell>
            <HomePage />
          </AppShell>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    <Route path="/boards" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <AppShell>
            <HomePage />
          </AppShell>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    {/* Board detail — full Kanban view (no AppShell sidebar needed over board bg) */}
    <Route path="/boards/:boardId" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <AppShell>
            <BoardPage />
          </AppShell>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    <Route path="/workspace/:workspaceId/settings" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <AppShell>
            <WorkspaceSettings />
          </AppShell>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    <Route path="/workspace/:workspaceId/members" element={
      <PrivateRoute>
        <WorkspaceProvider>
          <AppShell>
            <MembersPage />
          </AppShell>
        </WorkspaceProvider>
      </PrivateRoute>
    } />

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
