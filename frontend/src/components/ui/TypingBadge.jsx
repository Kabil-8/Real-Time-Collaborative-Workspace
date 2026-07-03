/**
 * components/ui/TypingBadge.jsx
 * ──────────────────────────────────────────────────────────────────
 * Animated chip that shows which collaborators are currently typing.
 *
 * Props:
 *   typists  — Array<{ userId, name, avatarColor }>  (from useTypingIndicator)
 *   compact  — boolean  (default false) — when true, shows a tiny variant
 *              suitable for the column header; false = full pill with names
 *
 * The component fades in/out smoothly using CSS transition on opacity.
 * It renders nothing when typists is empty (no DOM node at all after fade).
 */

import React, { useEffect, useRef, useState } from "react";

// ── Animated dots ─────────────────────────────────────────────────────────────
const AnimatedDots = () => (
  <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "2px" }}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          width: "3px",
          height: "3px",
          borderRadius: "50%",
          background: "currentColor",
          display: "inline-block",
          animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }}
      />
    ))}
  </span>
);

// ── Avatar chip ───────────────────────────────────────────────────────────────
const AvatarChip = ({ name, avatarColor, size = 16 }) => (
  <span
    title={name}
    style={{
      width:  size,
      height: size,
      borderRadius: "50%",
      background:   `linear-gradient(135deg, ${avatarColor || "#7c3aed"}, #4f46e5)`,
      display:      "inline-flex",
      alignItems:   "center",
      justifyContent: "center",
      fontSize:     size * 0.45,
      fontWeight:   700,
      color:        "#fff",
      flexShrink:   0,
      border:       "1.5px solid rgba(0,0,0,0.15)",
    }}
  >
    {name?.[0]?.toUpperCase() || "?"}
  </span>
);

// ── Main component ─────────────────────────────────────────────────────────────
/**
 * @param {{ typists: Array<{ userId: string, name: string, avatarColor: string }>, compact?: boolean }} props
 */
const TypingBadge = ({ typists = [], compact = false }) => {
  // Keep the last non-empty typists so the fade-out animation shows the correct names
  const lastTypistsRef = useRef(typists);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typists.length > 0) {
      lastTypistsRef.current = typists;
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [typists]);

  const displayed = visible ? typists : lastTypistsRef.current;
  if (displayed.length === 0) return null;

  const names = displayed.map((t) => t.name.split(" ")[0]); // first name only
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
      ? `${names[0]} & ${names[1]} are typing`
      : `${names[0]} & ${names.length - 1} others are typing`;

  // ── Compact variant (column header) ───────────────────────────────────────
  if (compact) {
    return (
      <span
        aria-live="polite"
        aria-label={label}
        title={label}
        style={{
          display:      "inline-flex",
          alignItems:   "center",
          gap:          "3px",
          opacity:       visible ? 1 : 0,
          transition:   "opacity 0.35s ease",
          pointerEvents: "none",
        }}
      >
        {/* Stacked avatars */}
        <span style={{ display: "inline-flex", marginRight: "2px" }}>
          {displayed.slice(0, 3).map((t, i) => (
            <span
              key={t.userId}
              style={{ marginLeft: i === 0 ? 0 : "-5px", zIndex: 3 - i }}
            >
              <AvatarChip name={t.name} avatarColor={t.avatarColor} size={14} />
            </span>
          ))}
        </span>
        {/* Pencil + dots */}
        <span
          style={{
            fontSize:    "10px",
            color:       "#a78bfa",
            fontWeight:  600,
            letterSpacing: "0.01em",
            display:     "inline-flex",
            alignItems:  "center",
            gap:         "2px",
          }}
        >
          ✏️
          <AnimatedDots />
        </span>

        {/* Inject keyframes once via a style tag */}
        <style>{`
          @keyframes typing-dot {
            0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
            30%            { opacity: 1;   transform: translateY(-2px); }
          }
        `}</style>
      </span>
    );
  }

  // ── Full pill variant (card modal, etc.) ─────────────────────────────────
  return (
    <div
      aria-live="polite"
      aria-label={label}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "6px",
        padding:      "5px 10px",
        borderRadius: "999px",
        background:   "rgba(124,58,237,0.10)",
        border:       "1px solid rgba(124,58,237,0.20)",
        width:        "fit-content",
        opacity:       visible ? 1 : 0,
        transform:     visible ? "translateY(0)" : "translateY(4px)",
        transition:   "opacity 0.35s ease, transform 0.35s ease",
        pointerEvents: "none",
      }}
    >
      {/* Stacked avatars */}
      <span style={{ display: "inline-flex" }}>
        {displayed.slice(0, 3).map((t, i) => (
          <span
            key={t.userId}
            style={{ marginLeft: i === 0 ? 0 : "-6px", zIndex: 3 - i }}
          >
            <AvatarChip name={t.name} avatarColor={t.avatarColor} size={18} />
          </span>
        ))}
      </span>

      <span
        style={{
          fontSize:   "11px",
          fontWeight: 600,
          color:      "#a78bfa",
          display:    "inline-flex",
          alignItems: "center",
          gap:        "3px",
          whiteSpace: "nowrap",
        }}
      >
        {label}
        <AnimatedDots />
      </span>

      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
          30%            { opacity: 1;   transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
};

export default TypingBadge;
