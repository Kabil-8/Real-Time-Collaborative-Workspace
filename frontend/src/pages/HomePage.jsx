import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trello, Users, AlertCircle, CheckSquare, ListTodo,
  TrendingUp, Clock, Calendar, ArrowRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../utils/api";

const PRIORITY_COLORS = {
  critical: { fill: "#ef4444", textVar: "var(--text-error)", bgAlpha: "rgba(239,68,68,0.10)", borderAlpha: "rgba(239,68,68,0.20)" },
  high: { fill: "#f97316", textVar: "rgba(249,115,22,1)", bgAlpha: "rgba(249,115,22,0.10)", borderAlpha: "rgba(249,115,22,0.20)" },
  medium: { fill: "#eab308", textVar: "rgba(234,179,8,1)", bgAlpha: "rgba(234,179,8,0.10)", borderAlpha: "rgba(234,179,8,0.20)" },
  low: { fill: "#3b82f6", textVar: "rgba(59,130,246,1)", bgAlpha: "rgba(59,130,246,0.10)", borderAlpha: "rgba(59,130,246,0.20)" },
  none: { fill: "#64748b", textVar: "var(--text-tertiary)", bgAlpha: "rgba(100,116,139,0.10)", borderAlpha: "rgba(100,116,139,0.20)" }
};

// Avatar Component
const MemberAvatar = ({ name, avatar, color }) => {
  const initials = name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (avatar) {
    return <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white text-xs flex-shrink-0"
      style={{ backgroundColor: color || "#6366f1" }}
    >
      {initials}
    </div>
  );
};

const HomePage = () => {
  const { user } = useAuth();
  const { activeWorkspace, fetchWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [invitations, setInvitations] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const fetchInvitations = async () => {
    setLoadingInvites(true);
    try {
      const { data } = await api.get("/workspaces/invitations");
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error("Failed to fetch invitations", err);
    } finally {
      setLoadingInvites(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace._id}/analytics`);
      setAnalytics(data.analytics);
    } catch (err) {
      console.error("Failed to fetch workspace analytics", err);
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    fetchInvitations();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [activeWorkspace]);

  const handleAcceptInvite = async (token) => {
    try {
      await api.post(`/workspaces/accept-invite/${token}`);
      await fetchWorkspaces();
      await fetchInvitations();
    } catch (err) {
      console.error("Failed to accept invitation", err);
      alert(err.response?.data?.message || "Failed to accept invitation");
    }
  };

  const handleRejectInvite = async (token) => {
    try {
      await api.post(`/workspaces/reject-invite/${token}`);
      await fetchInvitations();
    } catch (err) {
      console.error("Failed to reject invitation", err);
      alert(err.response?.data?.message || "Failed to reject invitation");
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Priority SVG Donut calculations
  const renderPriorityDonut = () => {
    if (!analytics || !analytics.priorityDistribution) return null;
    const dist = analytics.priorityDistribution;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);

    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48" style={{ color: "var(--text-muted)" }}>
          <CheckSquare size={32} className="mb-2 opacity-50" />
          <span className="text-xs">No tasks to analyze priority</span>
        </div>
      );
    }

    const radius = 40;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    const segments = Object.entries(dist)
      .filter(([_, val]) => val > 0)
      .map(([key, val]) => {
        const percentage = val / total;
        const strokeLength = percentage * circumference;
        const offset = circumference - strokeLength + accumulatedOffset;
        accumulatedOffset += strokeLength;

        return {
          key,
          val,
          color: PRIORITY_COLORS[key].fill,
          strokeDasharray: `${strokeLength} ${circumference}`,
          strokeDashoffset: offset,
          percentage: Math.round(percentage * 100)
        };
      });

    return (
      <div className="flex items-center gap-6">
        <div className="relative w-36 h-36 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="var(--bg-surface-4)"
              strokeWidth={strokeWidth}
            />
            {segments.map((seg) => (
              <circle
                key={seg.key}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                className="transition-all duration-300"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{total}</span>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cards</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {Object.entries(dist).map(([key, val]) => {
            if (val === 0) return null;
            const pct = Math.round((val / total) * 100);
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[key].fill }} />
                  <span className="capitalize" style={{ color: "var(--text-secondary)" }}>{key}</span>
                </div>
                <div className="flex gap-2 items-center text-right font-medium">
                  <span style={{ color: "var(--text-tertiary)" }}>{val}</span>
                  <span style={{ color: "var(--text-muted)" }} className="w-8">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            {activeWorkspace
              ? `Here's what's happening in ${activeWorkspace.name}`
              : "Create or join a workspace to get started."}
          </p>
        </div>
        {activeWorkspace && (
          <button
            onClick={() => navigate("/boards")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm"
            style={{
              background: "var(--bg-surface-3)",
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            <span>View Boards</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>

      {/* Invitations */}
      {invitations.length > 0 && (
        <div
          className="mb-8 rounded-3xl p-6"
          style={{
            background: "rgba(139, 92, 246, 0.08)",
            border: "1px solid rgba(139, 92, 246, 0.25)",
          }}
        >
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            ✉️ Workspace Invitations
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            You have been invited to join the following workspaces.
          </p>
          <div className="flex flex-col gap-3">
            {invitations.map((inv) => (
              <div
                key={inv.inviteToken}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: "var(--bg-surface-3)" }}
                  >
                    {inv.icon || "🏢"}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {inv.name}
                    </h3>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      Invited as{" "}
                      <span style={{ color: "var(--text-brand)" }} className="capitalize">
                        {inv.role}
                      </span>{" "}
                      by {inv.owner?.name || "Workspace Owner"} ({inv.owner?.email})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAcceptInvite(inv.inviteToken)}
                    className="px-4 py-2 rounded-xl text-white text-xs font-semibold transition-colors"
                    style={{ background: "var(--brand-primary)" }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectInvite(inv.inviteToken)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      background: "var(--bg-surface-4)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeWorkspace ? (
        loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl" style={{ background: "var(--skeleton-base)" }} />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              <div className="h-64 rounded-3xl" style={{ background: "var(--skeleton-base)" }} />
              <div className="h-64 rounded-3xl" style={{ background: "var(--skeleton-base)" }} />
            </div>
          </div>
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center rounded-3xl p-8"
            style={{
              background: "rgba(220,38,38,0.05)",
              border: "1px solid rgba(220,38,38,0.20)",
              color: "var(--text-error)",
            }}
          >
            <AlertCircle size={40} className="mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error loading analytics</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 rounded-xl text-sm"
              style={{
                background: "var(--bg-surface-4)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
              }}
            >
              Try Again
            </button>
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Boards",
                  value: analytics.stats.totalBoards,
                  icon: Trello,
                  iconColor: "var(--text-brand)",
                  iconBg: "rgba(124,58,237,0.10)",
                  iconBorder: "rgba(124,58,237,0.20)",
                },
                {
                  label: "Active Cards",
                  value: analytics.stats.totalCards,
                  icon: CheckSquare,
                  iconColor: "rgba(16,185,129,1)",
                  iconBg: "rgba(16,185,129,0.10)",
                  iconBorder: "rgba(16,185,129,0.20)",
                },
                {
                  label: "Workspace Members",
                  value: analytics.stats.totalMembers,
                  icon: Users,
                  iconColor: "rgba(59,130,246,1)",
                  iconBg: "rgba(59,130,246,0.10)",
                  iconBorder: "rgba(59,130,246,0.20)",
                },
                {
                  label: "Overdue Tasks",
                  value: analytics.stats.overdueCount,
                  icon: AlertCircle,
                  iconColor: "var(--text-error)",
                  iconBg: "rgba(220,38,38,0.10)",
                  iconBorder: "rgba(220,38,38,0.20)",
                  pulse: analytics.stats.overdueCount > 0,
                }
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5 flex items-center justify-between
                    hover:scale-[1.02] transition-all duration-200"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>
                      {stat.label}
                    </span>
                    <h2 className="text-3xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                      {stat.value}
                    </h2>
                  </div>
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-center ${stat.pulse ? "animate-pulse" : ""}`}
                    style={{
                      color: stat.iconColor,
                      background: stat.iconBg,
                      borderColor: stat.iconBorder,
                    }}
                  >
                    <stat.icon size={20} />
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Priorities */}
              <div
                className="rounded-3xl p-6"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={18} style={{ color: "var(--text-brand)" }} />
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    Card Priorities
                  </h3>
                </div>
                {renderPriorityDonut()}
              </div>

              {/* Status List */}
              <div
                className="rounded-3xl p-6"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <ListTodo size={18} style={{ color: "var(--text-brand)" }} />
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    Status Distribution
                  </h3>
                </div>
                {Object.keys(analytics.listDistribution).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48" style={{ color: "var(--text-muted)" }}>
                    <ListTodo size={32} className="mb-2 opacity-50" />
                    <span className="text-xs">No status data to analyze</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 max-h-52 overflow-y-auto pr-1">
                    {Object.entries(analytics.listDistribution).map(([label, value]) => {
                      const maxVal = Math.max(...Object.values(analytics.listDistribution), 1);
                      const percentage = (value / maxVal) * 100;
                      return (
                        <div key={label} className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium truncate max-w-[200px]" style={{ color: "var(--text-secondary)" }}>
                              {label}
                            </span>
                            <span className="font-semibold" style={{ color: "var(--text-brand)" }}>{value}</span>
                          </div>
                          <div
                            className="h-2 w-full rounded-full overflow-hidden"
                            style={{ background: "var(--bg-surface-4)" }}
                          >
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assignee Load */}
              <div
                className="rounded-3xl p-6"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Users size={18} style={{ color: "var(--text-brand)" }} />
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    Assignee Workload
                  </h3>
                </div>
                {analytics.assigneeLoad.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48" style={{ color: "var(--text-muted)" }}>
                    <Users size={32} className="mb-2 opacity-50" />
                    <span className="text-xs">No members in workspace</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-1">
                    {analytics.assigneeLoad.map((member) => {
                      const maxCards = Math.max(...analytics.assigneeLoad.map(m => m.cardCount), 1);
                      const percentage = (member.cardCount / maxCards) * 100;
                      return (
                        <div key={member._id} className="flex items-center gap-3">
                          <MemberAvatar name={member.name} avatar={member.avatar} color={member.avatarColor} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                {member.name}
                              </span>
                              <span className="font-semibold" style={{ color: "var(--text-tertiary)" }}>
                                {member.cardCount} cards
                              </span>
                            </div>
                            <div
                              className="h-1.5 w-full rounded-full overflow-hidden"
                              style={{ background: "var(--bg-surface-4)" }}
                            >
                              <div
                                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Urgent & Overdue */}
              <div
                className="rounded-3xl p-6"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Clock size={18} style={{ color: "var(--text-error)" }} />
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    Urgent & Overdue Tasks
                  </h3>
                </div>
                {analytics.urgentCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48" style={{ color: "var(--text-muted)" }}>
                    <Clock size={32} className="mb-2 opacity-50" />
                    <span className="text-xs">No urgent deadlines in sight</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {analytics.urgentCards.map((card) => {
                      const isOverdue = card.status === "overdue";
                      return (
                        <button
                          key={card._id}
                          onClick={() => card.board && navigate(`/boards/${card.board._id}`)}
                          className="w-full text-left p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3
                            transition-all duration-200"
                          style={{
                            background: "var(--bg-surface-2)",
                            border: "1px solid var(--border-subtle)",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "var(--border-brand)";
                            e.currentTarget.style.background = "var(--bg-surface-3)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "var(--border-subtle)";
                            e.currentTarget.style.background = "var(--bg-surface-2)";
                          }}
                        >
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold truncate transition-colors" style={{ color: "var(--text-primary)" }}>
                              {card.title}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1" style={{ color: "var(--text-muted)", fontSize: "10.5px" }}>
                              <Trello size={10} />
                              <span className="truncate">{card.board?.title || "Board"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 flex-shrink-0 self-end sm:self-auto">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                              style={
                                isOverdue
                                  ? { background: "rgba(220,38,38,0.10)", color: "var(--text-error)", border: "1px solid rgba(220,38,38,0.20)" }
                                  : { background: "rgba(249,115,22,0.10)", color: "rgba(249,115,22,1)", border: "1px solid rgba(249,115,22,0.20)" }
                              }
                            >
                              {isOverdue ? "Overdue" : "Due Soon"}
                            </span>
                            <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                              <Calendar size={11} />
                              <span>{new Date(card.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
            style={{ background: "var(--bg-surface-3)" }}
          >
            🏢
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            No workspace yet
          </h3>
          <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-secondary)" }}>
            Create or select a workspace from the sidebar to view metrics.
          </p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
