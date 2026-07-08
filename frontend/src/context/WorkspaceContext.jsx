import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "./AuthContext";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentId, setCurrentId] = useState(() => localStorage.getItem("currentWorkspaceId"));
  const [loading, setLoading] = useState(false);

  const selectWorkspace = useCallback((id) => {
    setCurrentId(id);
    if (id) localStorage.setItem("currentWorkspaceId", id);
    else localStorage.removeItem("currentWorkspaceId");
  }, []);

  const refresh = useCallback(async () => {
    if (!user) { setWorkspaces([]); return; }
    setLoading(true);
    try {
      const res = await api.get("/workspaces");
      const list = res.data.data.workspaces || [];
      setWorkspaces(list);
      if (!currentId && list[0]) selectWorkspace(list[0]._id);
    } finally {
      setLoading(false);
    }
  }, [user, currentId, selectWorkspace]);

  useEffect(() => { refresh(); }, [refresh]);

  const createWorkspace = useCallback(async (name) => {
    const res = await api.post("/workspaces", { name });
    const ws = res.data.data.workspace;
    setWorkspaces((prev) => [ws, ...prev]);
    selectWorkspace(ws._id);
    return ws;
  }, [selectWorkspace]);

  const current = workspaces.find((w) => w._id === currentId) || null;

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, current, currentId, loading, refresh, selectWorkspace, createWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}