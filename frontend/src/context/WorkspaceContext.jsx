import React, { createContext, useContext, useState, useCallback } from "react";
import api from "../utils/api";

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const { data } = await api.get("/workspaces");
      setWorkspaces(data.workspaces);
      // Auto-select first workspace if none active
      if (!activeWorkspace && data.workspaces.length > 0) {
        setActiveWorkspace(data.workspaces[0]);
      }
      return data.workspaces;
    } catch (err) {
      console.error("Failed to fetch workspaces", err);
      return [];
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [activeWorkspace]);

  const createWorkspace = useCallback(async (payload) => {
    try {
      const { data } = await api.post("/workspaces", payload);
      setWorkspaces((prev) => [data.workspace, ...prev]);
      setActiveWorkspace(data.workspace);
      return { success: true, workspace: data.workspace };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to create workspace.",
      };
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

  const removeMember = useCallback(async (workspaceId, userId) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
      setWorkspaces((prev) =>
        prev.map((w) => {
          if (w._id === workspaceId) {
            const updatedMembers = w.members.filter((m) => (m.user?._id || m.user) !== userId);
            return { ...w, members: updatedMembers };
          }
          return w;
        })
      );
      if (activeWorkspace?._id === workspaceId) {
        setActiveWorkspace((prev) => {
          if (!prev) return null;
          const updatedMembers = prev.members.filter((m) => (m.user?._id || m.user) !== userId);
          return { ...prev, members: updatedMembers };
        });
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Failed to remove member." };
    }
  }, [activeWorkspace]);

  const selectWorkspace = useCallback((workspace) => {
    setActiveWorkspace(workspace);
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loadingWorkspaces,
        fetchWorkspaces,
        createWorkspace,
        updateWorkspace,
        inviteMember,
        removeMember,
        selectWorkspace,
        setWorkspaces,
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
