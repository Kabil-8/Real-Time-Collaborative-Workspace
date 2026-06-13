import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import api from "../utils/api";

/**
 * AcceptInvitePage — /invite/:token
 * Calls POST /api/workspaces/accept-invite/:token and redirects on success.
 */
const AcceptInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
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
        // Redirect after 2 seconds
        setTimeout(() => navigate("/"), 2000);
      })
      .catch((err) => {
        const msg =
          err.response?.data?.message ||
          "This invite link is invalid or has expired.";
        setMessage(msg);
        setStatus("error");
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center animate-scale-in">
        {/* Logo */}
        <div className="inline-flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/30">
            Z
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">Zaalima</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-10 shadow-2xl">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={40} className="text-violet-400 animate-spin" />
              <p className="text-slate-300 font-medium">Accepting your invitation…</p>
              <p className="text-slate-500 text-sm">Please wait a moment.</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle size={36} className="text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white mb-1">You're in! 🎉</h1>
                <p className="text-slate-400 text-sm">
                  You've joined <span className="text-white font-semibold">{workspaceName}</span>.
                  <br />Redirecting you now…
                </p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden mt-2">
                <div className="h-1 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-[progress_2s_linear_forwards]"
                  style={{ animation: "width 2s linear forwards", width: "0%" }}
                />
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center">
                <XCircle size={36} className="text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white mb-1">Invite Failed</h1>
                <p className="text-slate-400 text-sm">{message}</p>
              </div>
              <button
                onClick={() => navigate("/")}
                className="mt-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                Go to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
