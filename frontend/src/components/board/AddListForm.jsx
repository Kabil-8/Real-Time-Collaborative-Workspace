import React, { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";

const AddListForm = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onAdd(t);
    setTitle("");
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="add-list-column">
        <button className="add-list-trigger" onClick={() => setOpen(true)}>
          <Plus size={16} /> Add another list
        </button>
      </div>
    );
  }

  return (
    <div className="add-list-column">
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--kanban-list-bg)",
          border: "1px solid var(--kanban-list-border)",
          borderRadius: "var(--radius-lg)",
          padding: 12,
          backdropFilter: "blur(12px)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter list title…"
          onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setTitle(""); } }}
          className="field-input"
          style={{ fontSize: 13.5, padding: "8px 10px" }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <button type="submit" className="btn btn-primary btn-sm">
            <Plus size={13} /> Add list
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => { setOpen(false); setTitle(""); }}
          >
            <X size={15} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddListForm;
