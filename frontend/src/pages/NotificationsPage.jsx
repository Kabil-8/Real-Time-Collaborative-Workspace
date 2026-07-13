import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.data.notifications || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id) {
    const res = await api.patch(`/notifications/${id}/read`);
    setNotifications((previous) => previous.map((item) => (
      item._id === id ? res.data.data.notification : item
    )));
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    setNotifications((previous) => previous.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Notifications</h1><p className="text-sm text-slate-500">Updates about cards you follow.</p></div>
        {notifications.some((item) => !item.readAt) && <button onClick={markAllRead} className="text-sm text-brand-600 hover:underline">Mark all read</button>}
      </div>
      {loading ? <p className="text-slate-500">Loading notifications…</p> : notifications.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 py-16 text-center text-slate-500">You're all caught up.</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => (
            <div key={item._id} className={`rounded-lg border p-4 ${item.readAt ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50"}`}>
              {item.boardId ? <Link to={`/board/${item.boardId}`} onClick={() => !item.readAt && markRead(item._id)} className="block text-sm font-medium text-slate-800">{item.message}</Link> : <p className="text-sm font-medium">{item.message}</p>}
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500"><span>{new Date(item.createdAt).toLocaleString()}</span>{!item.readAt && <button onClick={() => markRead(item._id)} className="text-brand-600 hover:underline">Mark read</button>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
