import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import api from "../utils/api";

/**
 * AcceptInvitePage — /invite/:token
 * Calls POST /api/workspaces/accept-invite/:token and redirects on success.
 */
const AcceptInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invite token provided.");
      return;
    }
    api
      .post(`/workspaces/accept-invite/${token}`)
      .then(({ data }) => {
        setWorkspaceName(data.workspace?.name || "the workspace");
        setStatus("success");
        setTimeout(() => navigate("/"), 2500);
      })
      .catch((err) => {
        setMessage(err.response?.data?.message || "This invite link is invalid or has expired.");
        setStatus("error");
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 overflow-hidden">
      {/* Ambient orbs */}
      <div className="orb orb-violet w-[500px] h-[500px] top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="orb orb-indigo w-[300px] h-[300px] bottom-1/4 right-1/4" />

      <div className="relative w-full max-w-md text-center animate-scale-in">
        {/* Logo */}
        <div className="inline-flex items-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
            flex items-center justify-center text-white font-black text-xl
            shadow-lg shadow-violet-500/40 glow-violet-sm">
            Z
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Zaalima</span>
        </div>

        <div className="glass rounded-2xl p-10 shadow-2xl">
          {/* Loading */}
          {status === "loading" && (
            <div className="flex flex-col items-center gap-5">
              <div className="spinner-gradient w-12 h-12"
                style={{ width: 48, height: 48 }} />
              <div>
                <p className="text-white font-semibold text-lg mb-1">Accepting invitation…</p>
                <p className="text-slate-500 text-sm">Please wait a moment.</p>
              </div>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="flex flex-col items-center gap-5 animate-fade-in">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20
                  flex items-center justify-center glow-emerald-sm">
                  <CheckCircle size={40} className="text-emerald-400" />
                </div>
                {/* Ping rings */}
                <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500/30 animate-ping" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white mb-2">You're in! 🎉</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  You've joined{" "}
                  <span className="text-white font-semibold">{workspaceName}</span>.
                  <br />Redirecting you to your workspace…
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full animate-progress"
                  style={{
                    background: "linear-gradient(90deg, #7c3aed, #34d399)",
                    animationDuration: "2.5s",
                  }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-5 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20
                flex items-center justify-center">
                <XCircle size={40} className="text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white mb-2">Invite Failed</h1>
                <p className="text-slate-400 text-sm">{message}</p>
              </div>
              <button
                onClick={() => navigate("/")}
                className="btn-primary"
              >
                Go to dashboard
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
