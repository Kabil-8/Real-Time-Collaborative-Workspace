import React, { memo } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getAvatarColor = (name = "") => {
  const colors = [
    "#8b5cf6", "#6366f1", "#0ea5e9", "#10b981",
    "#f59e0b", "#f43f5e", "#ec4899",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const buildSentence = (users) => {
  if (!users.length) return "";
  const names = users.slice(0, 2).map((u) => u.name.split(" ")[0]);
  const rest = users.length - 2;
  if (rest > 0) return `${names.join(", ")} +${rest} more`;
  return names.join(" & ");
};

/**
 * TypingIndicator — animated "… is typing" bubble.
 *
 * Props:
 *   users  — Array<{ userId, name, avatarColor }>
 *   inline — if true, render as a compact pill (for card modal)
 */
const TypingIndicator = memo(({ users = [], inline = false }) => {
  if (!users.length) return null;

  const sentence = buildSentence(users);

  if (inline) {
    return (
      <div className="typing-indicator-inline" aria-live="polite">
        <div className="typing-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="typing-text">
          <strong>{sentence}</strong>{" "}
          {users.length === 1 ? "is" : "are"} typing…
        </span>
      </div>
    );
  }

  return (
    <div className="typing-indicator-bar" aria-live="polite">
      {/* Mini avatars */}
      <div className="typing-avatars">
        {users.slice(0, 3).map((u) => {
          const color = u.avatarColor || getAvatarColor(u.name);
          const initials = (u.name || "?")
            .split(" ")
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase();
          return (
            <div
              key={u.userId}
              className="typing-avatar"
              style={{ background: color }}
              title={u.name}
            >
              {initials}
            </div>
          );
        })}
      </div>

      {/* Animated dots */}
      <div className="typing-dots">
        <span />
        <span />
        <span />
      </div>

      {/* Text */}
      <span className="typing-text">
        <strong>{sentence}</strong>{" "}
        {users.length === 1 ? "is" : "are"} typing…
      </span>
    </div>
  );
});

TypingIndicator.displayName = "TypingIndicator";
export default TypingIndicator;
