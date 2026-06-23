import React, { createContext, useContext, useState, useCallback } from "react";
import api from "../utils/api";

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces]           = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [boards, setBoards]                   = useState([]);
  const [loadingBoards, setLoadingBoards]     = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const { data } = await api.get("/workspaces");
      setWorkspaces(data.workspaces);
      // Auto-select first workspace if none active
      if (data.workspaces.length > 0) {
        setActiveWorkspace((prev) => prev ?? data.workspaces[0]);
      }
      return data.workspaces;
    } catch (err) {
      console.error("Failed to fetch workspaces", err);
      return [];
    } finally {
      setLoadingWorkspaces(false);
    }
  }, []);

  const createWorkspace = useCallback(async (payload) => {
    try {
      const { data } = await api.post("/workspaces", payload);
      setWorkspaces((prev) => [data.workspace, ...prev]);
      setActiveWorkspace(data.workspace);
      setBoards([]); // reset boards for the new workspace
      return { success: true, workspace: data.workspace };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to create workspace.",
      };
    }
  }, []);

  // ── Board management ─────────────────────────────────────────────
  const fetchBoards = useCallback(async (workspaceId) => {
    if (!workspaceId) return;
    setLoadingBoards(true);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/boards`);
      setBoards(data.boards || []);
    } catch (err) {
      console.error("Failed to fetch boards", err);
    } finally {
      setLoadingBoards(false);
    }
  }, []);

  const createBoard = useCallback(async (title, workspaceId) => {
    try {
      const { data } = await api.post("/boards", { title, workspaceId });
      setBoards((prev) => [data.board, ...prev]);
      return { success: true, board: data.board };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Failed to create board." };
    }
  }, []);

  const updateWorkspace = useCallback(async (workspaceId, updates) => {
    try {
      const { data } = await api.patch(`/workspaces/${workspaceId}`, updates);
      setWorkspaces((prev) =>
        prev.map((w) => (w._id === workspaceId ? data.workspace : w))
      );
      if (activeWorkspace?._id === workspaceId) {
        setActiveWorkspace(data.workspace);
      }
      return { success: true, workspace: data.workspace };
    } catch (err) {
      return { success: false, message: err.response?.data?.message };
    }
  }, [activeWorkspace]);

  // Clear boards when workspace changes
  const selectWorkspace = useCallback((workspace) => {
    setActiveWorkspace(workspace);
    setBoards([]);
  }, []);

  const inviteMember = useCallback(async (workspaceId, email, role = "member") => {
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/invite`, {
        email,
        role,
      });
      return { success: true, invite: data.invite };
    } catch (err) {
      return { success: false, message: err.response?.data?.message };
    }
  }, []);



  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loadingWorkspaces,
        boards,
        loadingBoards,
        fetchWorkspaces,
        fetchBoards,
        createWorkspace,
        createBoard,
        updateWorkspace,
        inviteMember,
        selectWorkspace,
        setWorkspaces,
        setBoards,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};

export default WorkspaceContext;
