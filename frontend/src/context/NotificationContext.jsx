import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import api from "../utils/api";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, hasMore: true, total: 0 });
  const toastQueueRef = useRef([]);
  const [toast, setToast] = useState(null);

  // ── Fetch notifications from API ──────────────────────────────────────────
  const fetchNotifications = useCallback(async (page = 1, replace = true) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/notifications?page=${page}&limit=20`);
      setNotifications((prev) =>
        replace ? data.notifications : [...prev, ...data.notifications]
      );
      setUnreadCount(data.unreadCount || 0);
      setPagination({
        page: data.pagination.page,
        hasMore: data.pagination.hasMore,
        total: data.pagination.total,
      });
    } catch {
      // Fail silently — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Fetch unread count only (lightweight, for sidebar badge) ──────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnreadCount(data.count || 0);
    } catch {}
  }, [user]);

  // ── Mark single notification as read ─────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true, readAt: new Date() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }, []);

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  // ── Delete single ─────────────────────────────────────────────────────────
  const deleteNotification = useCallback(async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => {
        const target = prev.find((n) => n._id === id);
        if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n._id !== id);
      });
    } catch {}
  }, []);

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    try {
      await api.delete("/notifications/clear-all");
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  }, []);

  // ── Load more (pagination) ────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!loading && pagination.hasMore) {
      fetchNotifications(pagination.page + 1, false);
    }
  }, [loading, pagination, fetchNotifications]);

  // ── Show toast for 4s then clear ─────────────────────────────────────────
  const showToast = useCallback((notif) => {
    setToast(notif);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Socket: real-time new notification ───────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handler = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
      showToast(notif);
    };

    socket.on("notify:new", handler);
    return () => socket.off("notify:new", handler);
  }, [socket, showToast]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      fetchNotifications(1, true);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    pagination,
    toast,
    setToast,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    loadMore,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

export default NotificationContext;
