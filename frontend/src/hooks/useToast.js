/**
 * useToast.js
 * ─────────────────────────────────────────────────────────────────
 * Lightweight stacked toast system backed by React context.
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast.success("Card saved!");
 *   toast.error("Server rejected: WIP limit reached.");
 *   toast.warning("Slow connection — retrying…");
 *   toast.info("Board refreshed.");
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
} from "react";

// ── Types ──────────────────────────────────────────────────────────
// toast shape: { id, type, message, duration }
// type ∈ "success" | "error" | "warning" | "info"

let _nextId = 1;

const reducer = (state, action) => {
  switch (action.type) {
    case "PUSH":
      // Deduplicate: if same message is already visible, update its id to reset timer
      return [
        ...state.filter((t) => t.message !== action.payload.message),
        action.payload,
      ];
    case "DISMISS":
      return state.filter((t) => t.id !== action.payload);
    default:
      return state;
  }
};

// ── Context ────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, dispatch] = useReducer(reducer, []);

  const push = useCallback((type, message, duration = 4000) => {
    const id = _nextId++;
    dispatch({ type: "PUSH", payload: { id, type, message, duration } });
    // auto-dismiss
    setTimeout(() => dispatch({ type: "DISMISS", payload: id }), duration + 300);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    dispatch({ type: "DISMISS", payload: id });
  }, []);

  const toast = {
    success: (msg, dur) => push("success", msg, dur),
    error:   (msg, dur) => push("error",   msg, dur),
    warning: (msg, dur) => push("warning", msg, dur),
    info:    (msg, dur) => push("info",    msg, dur),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
};
