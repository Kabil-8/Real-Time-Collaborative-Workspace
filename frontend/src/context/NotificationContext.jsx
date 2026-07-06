/**
 * context/NotificationContext.jsx
 *
 * Manages in-app notification state for the authenticated user:
 *   • Fetches initial unread count on mount (for the sidebar badge)
 *   • Lazily loads the full notification list when the panel is opened
 *   • Listens for real-time `notification:new` events via Socket.io
 *   • Provides markRead / markAllRead / deleteNotification actions
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import api from "../utils/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

export const NotificationProvider = ({ children }) => {
  const { user }                                  = useAuth();
  const [notifications,  setNotifications]        = useState([]);
  const [unreadCount,    setUnreadCount]           = useState(0);
  const [loading,        setLoading]               = useState(false);
  const [fetched,        setFetched]               = useState(false); // have we loaded the full list?
  const socketRef                                  = useRef(null);

  // ── Fetch unread count (lightweight — runs on every mount) ────────────────
  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnreadCount(data.count ?? 0);
    } catch {
      // silently fail — badge just stays at 0
    }
  }, [user]);

  // ── Fetch full notification list ──────────────────────────────────────────
  const fetchNotifications = useCallback(async ({ unread = false } = {}) => {
    if (!user) return;
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (unread) params.unread = "true";
      const { data } = await api.get("/notifications", { params });
      setNotifications(data.notifications || []);
      setFetched(true);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Mark a single notification read ──────────────────────────────────────
  const markRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  }, []);

  // ── Mark all notifications read ───────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  // ── Delete a notification ─────────────────────────────────────────────────
  const deleteNotification = useCallback(async (id) => {
    try {
      const notif = notifications.find((n) => n._id === id);
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (notif && !notif.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch { /* ignore */ }
  }, [notifications]);

  // ── Socket.io — real-time notification delivery ───────────────────────────
  useEffect(() => {
    if (!user) return;

    // Fetch the badge count first
    refreshUnreadCount();

    // Connect to personal notification socket
    const token = localStorage.getItem("zaalima_token");
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("notification:new", (notif) => {
      // Prepend to list if it has been fetched
      setNotifications((prev) => {
        if (!fetched) return prev;
        // avoid duplicates on reconnect
        if (prev.some((n) => n._id === notif._id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((c) => c + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetched,
    fetchNotifications,
    refreshUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
};
