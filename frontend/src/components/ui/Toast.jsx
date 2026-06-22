/**
 * Toast.jsx
 * ─────────────────────────────────────────────────────────────────
 * Stacked toast notification renderer.
 * Mount this once at the app root — it reads from ToastContext.
 *
 * Features:
 *  - Up to 5 toasts stacked, newest on top
 *  - Animated enter/exit (CSS keyframes in index.css)
 *  - Auto-dismiss progress bar
 *  - Types: success | error | warning | info
 *  - Accessible: role="alert" / aria-live="polite"
 */

import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useToast } from "../../hooks/useToast";

// ── Per-type config ────────────────────────────────────────────────
const CONFIG = {
  success: {
    Icon: CheckCircle2,
    bg:   "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.35)",
    iconColor: "#34d399",
    barColor:  "#10b981",
    textColor: "#a7f3d0",
  },
  error: {
    Icon: XCircle,
    bg:   "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.35)",
    iconColor: "#f87171",
    barColor:  "#ef4444",
    textColor: "#fca5a5",
  },
  warning: {
    Icon: AlertTriangle,
    bg:   "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.35)",
    iconColor: "#fcd34d",
    barColor:  "#f59e0b",
    textColor: "#fde68a",
  },
  info: {
    Icon: Info,
    bg:   "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.35)",
    iconColor: "#a5b4fc",
    barColor:  "#6366f1",
    textColor: "#c7d2fe",
  },
};

// ── Single toast item ──────────────────────────────────────────────
const ToastItem = ({ toast, onDismiss }) => {
  const cfg = CONFIG[toast.type] || CONFIG.info;
  const { Icon } = cfg;
  const [exiting, setExiting] = useState(false);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 280);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 280);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={exiting ? "toast-exit" : "toast-enter"}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "12px 14px",
        borderRadius: "14px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.20)",
        minWidth: "280px",
        maxWidth: "380px",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        userSelect: "none",
      }}
    >
      {/* Icon */}
      <Icon
        size={16}
        style={{ color: cfg.iconColor, flexShrink: 0, marginTop: "1px" }}
      />

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: "13px",
          fontWeight: 500,
          lineHeight: "1.45",
          color: cfg.textColor,
        }}
      >
        {toast.message}
      </span>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        style={{
          background: "none",
          border: "none",
          padding: "2px",
          borderRadius: "6px",
          cursor: "pointer",
          color: cfg.textColor,
          opacity: 0.6,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>

      {/* Progress bar */}
      <div
        className="toast-progress"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "2px",
          borderRadius: "0 0 14px 14px",
          background: cfg.barColor,
          animationDuration: `${toast.duration || 4000}ms`,
        }}
      />
    </div>
  );
};

// ── Toast container ────────────────────────────────────────────────
const ToastContainer = () => {
  const { toasts, dismiss } = useToast();

  // Show at most 5 toasts — discard oldest if overflowing
  const visible = toasts.slice(-5);

  if (visible.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {visible.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
