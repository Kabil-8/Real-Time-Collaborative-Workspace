import React, { useState } from "react";
import { X } from "lucide-react";
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

    if (result.success) {
      onClose();
    } else {
      setError(result.message || "Failed to create workspace.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Create workspace</h2>
          <button onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

         
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-3xl">{form.icon}</span>
            <div>
              <p className="font-semibold text-white text-sm">
                {form.name || "Workspace name"}
              </p>
              <p className="text-xs text-slate-500">{form.description || "No description"}</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Engineering, Marketing…"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700
                text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500
                focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Description <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What does this workspace track?"
              rows={2}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700
                text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500
                focus:border-transparent transition-all text-sm resize-none"
            />
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={`w-10 h-10 rounded-xl text-xl transition-all
                    ${form.icon === icon
                      ? "bg-violet-500/20 ring-2 ring-violet-500"
                      : "bg-slate-800 hover:bg-slate-700"
                    }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === color ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-white" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300
                hover:bg-slate-800 transition-colors text-sm font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
                text-white font-semibold text-sm hover:from-violet-500 hover:to-indigo-500
                disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20">
              {loading ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;
