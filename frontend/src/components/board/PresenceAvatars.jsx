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

/**
 * PresenceAvatars — stacked avatar row showing who is live on this board.
 *
 * Props:
 *   users        — Array<{ userId, name, avatarColor, avatar }>
 *   currentUser  — { _id } — used to filter self out optionally
 *   max          — max avatars to show before overflow count (default 4)
 */
const PresenceAvatars = memo(({ users = [], currentUser, max = 4 }) => {
  // Exclude current user from presence list
  const others = users.filter((u) => u.userId !== currentUser?._id?.toString());

  if (!others.length) return null;

  const visible = others.slice(0, max);
  const overflow = others.length - max;

  return (
    <div className="presence-avatars" title={`${others.length} online`}>
      {visible.map((u, idx) => {
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
            className="presence-avatar"
            style={{
              background: color,
              zIndex: max - idx,
            }}
            title={u.name}
          >
            {u.avatar ? (
              <img
                src={u.avatar}
                alt={u.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            ) : (
              <span>{initials}</span>
            )}
            {/* Live dot */}
            <div className="presence-live-dot" />
          </div>
        );
      })}

      {overflow > 0 && (
        <div
          className="presence-avatar presence-overflow"
          title={`${overflow} more online`}
        >
          +{overflow}
        </div>
      )}

      {/* "Live" label */}
      <div className="presence-label">
        <span className="presence-pulse" />
        {others.length} online
      </div>
    </div>
  );
});

PresenceAvatars.displayName = "PresenceAvatars";
export default PresenceAvatars;
