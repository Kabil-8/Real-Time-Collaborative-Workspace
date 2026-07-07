import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

// ─── Floating Particles (reused from AuthPages) ──────────────────────────────
const Particles = () => {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 2 + 0.5,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.3 + 0.1,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-gradient-to-r from-cyan-400/30 to-emerald-400/30"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `float ${p.speed}s ease-in-out ${p.delay}s infinite alternate`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
};

// ─── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const config = {
    admin:  { emoji: "🛡️", label: "Admin",  color: "from-violet-400/20 to-purple-400/20",  border: "border-violet-400/40",  text: "text-violet-300"  },
    member: { emoji: "✏️", label: "Member", color: "from-cyan-400/20 to-emerald-400/20",   border: "border-cyan-400/40",    text: "text-cyan-300"    },
    viewer: { emoji: "👁️", label: "Viewer", color: "from-blue-400/20 to-indigo-400/20",    border: "border-blue-400/40",    text: "text-blue-300"    },
  };
  const c = config[role] || config.member;
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold
      bg-gradient-to-r ${c.color} border ${c.border} ${c.text} backdrop-blur-sm`}>
      {c.emoji} {c.label}
    </span>
  );
};

// ─── Invite Accept Page ───────────────────────────────────────────────────────
const InviteAcceptPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();

  const [status, setStatus]     = useState("loading"); // loading | preview | accepting | success | error
  const [inviteInfo, setInviteInfo] = useState(null);  // { workspaceName, role, invitedBy }
  const [errorMsg, setErrorMsg] = useState("");

  // ── Step 1: peek at the token to get workspace info (unauthenticated OK) ──
  useEffect(() => {
    if (authLoading) return;

    // If not logged in, redirect to login then come back
    if (!user) {
      navigate(`/login?redirect=/invite/${token}`, { replace: true });
      return;
    }

    const peek = async () => {
      try {
        // Accept the invite — backend validates token, email match, and membership
        const { data } = await api.post(`/workspaces/accept-invite/${token}`);
        setInviteInfo({ workspaceName: data.workspace?.name || "the workspace" });
        setStatus("success");
      } catch (err) {
        const msg = err.response?.data?.message || "Something went wrong.";
        // If already a member — treat as success
        if (err.response?.status === 409) {
          setInviteInfo({ workspaceName: "" });
          setStatus("already");
        } else if (err.response?.status === 403 && msg.toLowerCase().includes("different email")) {
          logout();
          navigate(`/login?redirect=/invite/${token}`, { replace: true });
        } else {
          setErrorMsg(msg);
          setStatus("error");
        }
      }
    };

    peek();
  }, [token, user, authLoading, navigate]);

  // ── Redirect to dashboard ──────────────────────────────────────────────────
  const goHome = () => navigate("/", { replace: true });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Aurora backgrounds */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px]
          bg-gradient-to-r from-cyan-500/20 via-emerald-400/15 to-cyan-500/20
          rounded-full blur-3xl animate-aurora" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px]
          bg-gradient-to-l from-violet-600/15 via-fuchsia-500/10 to-purple-600/15
          rounded-full blur-3xl animate-aurora-delayed" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px]
          bg-gradient-to-b from-blue-500/10 to-cyan-400/10
          rounded-full blur-3xl animate-aurora-slow" />
      </div>

      <Particles />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-5 relative group">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400
                flex items-center justify-center text-white font-bold text-2xl
                shadow-lg shadow-cyan-400/30 group-hover:shadow-cyan-400/50
                transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                Z
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-emerald-400
                rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            </div>
            <span className="text-white font-bold text-3xl tracking-tight bg-gradient-to-r
              from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              Zaalima
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-cyan-400/20 rounded-3xl p-8
          shadow-2xl shadow-cyan-400/10 relative overflow-hidden">

          {/* ── Loading ── */}
          {(status === "loading" || authLoading) && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-cyan-400/10 border border-cyan-400/20
                flex items-center justify-center">
                <span className="inline-block w-8 h-8 border-2 border-cyan-400/30
                  border-t-cyan-400 rounded-full animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Validating invite…</h2>
              <p className="text-cyan-200/50 text-sm">Checking your workspace invitation</p>
            </div>
          )}

          {/* ── Success ── */}
          {status === "success" && (
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-400/15
                border border-emerald-400/30 flex items-center justify-center text-4xl
                animate-bounce-slow">
                🎉
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">You're in!</h1>
              <p className="text-cyan-200/60 text-sm leading-relaxed mb-6">
                You've successfully joined{" "}
                <span className="text-cyan-300 font-semibold">
                  {inviteInfo?.workspaceName || "the workspace"}
                </span>
                . Start collaborating now!
              </p>
              <button
                onClick={goHome}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400
                  text-slate-950 font-bold text-base
                  hover:from-cyan-300 hover:to-emerald-300
                  transition-all duration-300 ease-out
                  shadow-lg shadow-cyan-400/30 hover:shadow-cyan-400/50
                  hover:scale-[1.02] active:scale-[0.98]
                  relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Go to Dashboard →
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-white/20 to-emerald-400/0
                  group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </div>
          )}

          {/* ── Already a member ── */}
          {status === "already" && (
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-cyan-400/10
                border border-cyan-400/20 flex items-center justify-center text-4xl">
                👋
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Already a member!</h1>
              <p className="text-cyan-200/60 text-sm leading-relaxed mb-6">
                You're already part of this workspace. Head to the dashboard to continue.
              </p>
              <button
                onClick={goHome}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400
                  text-slate-950 font-bold text-base
                  hover:from-cyan-300 hover:to-emerald-300
                  transition-all duration-300
                  shadow-lg shadow-cyan-400/30
                  hover:scale-[1.02] active:scale-[0.98]"
              >
                Go to Dashboard →
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-rose-500/10
                border border-rose-500/20 flex items-center justify-center text-4xl">
                ⛔
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Invite Invalid</h1>
              <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30
                text-rose-300 text-sm flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                {errorMsg}
              </div>
              <p className="text-cyan-200/50 text-sm mb-6">
                The invite link may have expired (links last 48 hours) or already been used.
                Ask the workspace owner to send a new invitation.
              </p>
              <button
                onClick={goHome}
                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-cyan-400/20
                  text-cyan-300 font-medium text-sm hover:bg-white/10 hover:border-cyan-400/40
                  transition-all duration-300"
              >
                ← Back to Dashboard
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-cyan-400/30 font-mono tracking-widest">
          ✦ SECURE • ENCRYPTED • PRIVATE ✦
        </div>
      </div>
    </div>
  );
};

export default InviteAcceptPage;
