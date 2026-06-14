import React, { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";

const ICONS = ["🏢", "🚀", "⚡", "🎯", "🛠️", "🌟", "🔥", "💡", "🎨", "📦"];
const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f97316", "#eab308", "#22c55e", "#3b82f6",
];

const CreateWorkspaceModal = ({ onClose }) => {
  const { createWorkspace } = useWorkspace();
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "🏢",
    color: "#6366f1",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Workspace name is required."); return; }
    setLoading(true);
    setError("");
    const result = await createWorkspace(form);
    setLoading(false);
    if (result.success) onClose();
    else setError(result.message || "Failed to create workspace.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
        style={{
          background: "rgba(15,23,42,0.95)",
          border: "1px solid rgba(148,163,184,0.08)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Sparkles size={15} className="text-violet-400" />
            </div>
            <h2 className="text-base font-bold text-white">Create workspace</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-300
              hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20
              text-red-400 text-sm flex items-center gap-2 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Live preview card */}
          <div
            className="relative rounded-2xl p-4 overflow-hidden transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${form.color}30, ${form.color}10, rgba(15,23,42,0.80))`,
              border: `1px solid ${form.color}30`,
            }}
          >
            {/* Glow orb */}
            <div
              className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-40 pointer-events-none"
              style={{ background: form.color }}
            />
            <div className="relative flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                  shadow-lg flex-shrink-0 transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${form.color}, ${form.color}99)`,
                  boxShadow: `0 8px 24px ${form.color}50`,
                }}
              >
                {form.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">
                  {form.name || <span className="text-white/30">Workspace name</span>}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {form.description || <span className="text-slate-600">No description</span>}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Engineering, Marketing…"
                maxLength={100}
                className="input-field"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                Description{" "}
                <span className="text-slate-600 font-normal text-xs">(optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What does this workspace track?"
                rows={2}
                maxLength={500}
                className="input-field resize-none"
              />
            </div>

            {/* Icon + Color grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      className={`w-9 h-9 rounded-xl text-lg transition-all duration-150
                        ${form.icon === icon
                          ? "bg-violet-500/20 ring-2 ring-violet-500 scale-110"
                          : "bg-slate-800/70 hover:bg-slate-700 hover:scale-105"
                        }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      className="w-8 h-8 rounded-full transition-all duration-200 hover:scale-110"
                      style={{
                        backgroundColor: color,
                        transform: form.color === color ? "scale(1.2)" : undefined,
                        boxShadow: form.color === color
                          ? `0 0 0 2px rgba(255,255,255,0.15), 0 0 0 4px ${color}60, 0 0 15px ${color}50`
                          : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-slate-700/60 text-slate-400
                  hover:bg-slate-800/60 hover:text-slate-200 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2
                  shadow-lg hover:shadow-xl active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)`,
                  boxShadow: `0 4px 20px ${form.color}40`,
                }}
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
                ) : (
                  <><Sparkles size={14} /> Create workspace</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;
