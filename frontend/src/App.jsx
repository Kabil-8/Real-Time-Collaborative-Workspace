import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import HomePage from "./pages/HomePage";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import BoardPage from "./pages/BoardPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import NotificationsPage from "./pages/NotificationsPage";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
      <Route path="/register" element={<RedirectIfAuthed><RegisterPage /></RedirectIfAuthed>} />
      <Route path="/" element={<RequireAuth><AppShell><HomePage /></AppShell></RequireAuth>} />
      <Route path="/board/:boardId" element={<RequireAuth><AppShell><BoardPage /></AppShell></RequireAuth>} />
      <Route path="/workspace/settings" element={<RequireAuth><AppShell><WorkspaceSettings /></AppShell></RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth><AppShell><NotificationsPage /></AppShell></RequireAuth>} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
