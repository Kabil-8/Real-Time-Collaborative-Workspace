import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from "./pages/AuthPages";
import AppShell from "./components/layout/AppShell";
import HomePage from "./pages/HomePage";
import BoardsPage from "./pages/BoardsPage";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import BoardPage from "./pages/BoardPage";
import SearchPage from "./pages/SearchPage";
import NotificationsPage from "./pages/NotificationsPage";
import MembersPage from "./pages/MembersPage";
import InviteAcceptPage from "./pages/InviteAcceptPage";

// Route guard: redirects to /login if not authenticated
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-app)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 22,
              animation: "pulse 1.5s infinite",
            }}
          >
            Z
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</p>
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

// Layout route to wrap protected routes
const ProtectedLayout = () => (
  <PrivateRoute>
    <WorkspaceProvider>
      <NotificationProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </NotificationProvider>
    </WorkspaceProvider>
  </PrivateRoute>
);

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
    <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
    <Route path="/invite/:token" element={<InviteAcceptPage />} />

    {/* Protected routes sharing shell and context */}
    <Route element={<ProtectedLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/boards" element={<BoardsPage />} />
      <Route path="/boards/:boardId" element={<BoardPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/workspace/:workspaceId/members" element={<MembersPage />} />
      <Route path="/workspace/:workspaceId/settings" element={<WorkspaceSettings />} />
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;
