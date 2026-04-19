import React, { useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

let _addToast = null;

export function toast(message, type = "info") {
  if (_addToast) _addToast(message, type);
}
toast.success = (msg) => toast(msg, "success");
toast.error = (msg) => toast(msg, "error");
toast.warning = (msg) => toast(msg, "warning");
toast.info = (msg) => toast(msg, "info");

const CONFIG = {
  success: { icon: CheckCircle, color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.3)" },
  error:   { icon: AlertCircle, color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
  warning: { icon: AlertTriangle, color: "#facc15", bg: "rgba(250,204,21,0.12)", border: "rgba(250,204,21,0.3)" },
  info:    { icon: Info, color: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.3)" },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  _addToast = useCallback((message, type) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
      {toasts.map((t) => {
        const { icon: Icon, color, bg, border } = CONFIG[t.type] || CONFIG.info;
        return (
          <div key={t.id} className="toast-enter" style={{ background: "#0f172a", backdropFilter: "blur(12px)", border: `1px solid ${border}`, borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "14px 16px", color: "white", display: "flex", alignItems: "flex-start", gap: 10, minWidth: 300, maxWidth: 420, boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 20px ${color}20`, pointerEvents: "all" }}>
            <Icon size={18} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 14, flex: 1, lineHeight: 1.5, color: "#e2e8f0" }}>{t.message}</span>
            <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", display: "flex", flexShrink: 0, marginTop: 1 }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
