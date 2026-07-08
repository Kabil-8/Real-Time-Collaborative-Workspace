import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

// ─── Input Field with Neon Focus ──────────────────────────────────────────
const InputField = ({ label, type, value, onChange, placeholder, error }) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-cyan-200/80 mb-2 tracking-wide">
      {label}
    </label>
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-5 py-3.5 rounded-2xl bg-white/5 backdrop-blur-md 
          border-2 text-white placeholder-cyan-300/40
          focus:outline-none focus:ring-4 focus:ring-cyan-400/30 
          transition-all duration-300 ease-out
          ${error ? "border-red-500/70 focus:ring-red-400/30" : "border-cyan-400/20 focus:border-cyan-400/60"}
          hover:border-cyan-400/40 hover:bg-white/8`}
      />
      {/* Animated focus glow */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-400/0 via-cyan-400/5 to-cyan-400/0 
        rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 
        transition-opacity duration-500" />
    </div>
    {error && (
      <p className="mt-2 text-sm text-rose-400 font-medium flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400" />
        {error}
      </p>
    )}
  </div>
);

// ─── Floating Particles Background ──────────────────────────────────────
const Particles = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 2 + 0.5,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.3 + 0.1,
    }));
    setParticles(newParticles);
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

// ─── Auth Shell with Aurora Background ──────────────────────────────────
const AuthShell = ({ title, subtitle, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
    {/* Animated Aurora gradients */}
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
      {/* Logo with neon glow */}
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
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{title}</h1>
        <p className="text-cyan-200/60 text-sm font-light tracking-wide">{subtitle}</p>
      </div>

      {/* Glass card with neon border */}
      <div className="bg-white/5 backdrop-blur-2xl border border-cyan-400/20 rounded-3xl p-8 
        shadow-2xl shadow-cyan-400/10 relative overflow-hidden
        before:absolute before:inset-0 before:rounded-3xl before:p-[1px] 
        before:bg-gradient-to-r before:from-cyan-400/20 before:via-emerald-400/20 before:to-cyan-400/20
        before:mask-gradient before:pointer-events-none">
        {children}
      </div>

      {/* Footer decoration */}
      <div className="mt-6 text-center text-xs text-cyan-400/30 font-mono tracking-widest">
        ✦ SECURE • ENCRYPTED • PRIVATE ✦
      </div>
    </div>
  </div>
);

// ─── Login Page ──────────────────────────────────────────────────────────
export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.password) errs.password = "Password is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setGlobalError("");
    const result = await login(form);
    setLoading(false);

    if (result.success) {
      navigate(redirect, { replace: true });
    } else {
      setGlobalError(result.message);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AuthShell title="Welcome Back" subtitle="Sign in to your workspace">
      <form onSubmit={handleSubmit}>
        {globalError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 
            text-rose-300 text-sm flex items-center gap-2 animate-shake">
            <span className="text-lg">⚠️</span>
            {globalError}
          </div>
        )}

        <InputField label="Email" type="email" value={form.email}
          onChange={set("email")} placeholder="you@company.com" error={errors.email} />

        <InputField label="Password" type="password" value={form.password}
          onChange={set("password")} placeholder="••••••••" error={errors.password} />

        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-cyan-400/30 bg-white/5 
                accent-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:ring-offset-0
                transition-all duration-200"
            />
            <span className="text-sm text-cyan-200/60 group-hover:text-cyan-200/80 transition-colors">
              Remember me
            </span>
          </label>
          <Link to="/forgot-password" className="text-sm text-cyan-400/70 hover:text-cyan-300 
            transition-colors font-medium hover:underline underline-offset-2">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400
            text-slate-950 font-bold text-base
            hover:from-cyan-300 hover:to-emerald-300
            disabled:opacity-50 disabled:cursor-not-allowed 
            transition-all duration-300 ease-out
            shadow-lg shadow-cyan-400/30 hover:shadow-cyan-400/50
            hover:scale-[1.02] active:scale-[0.98]
            relative overflow-hidden group"
        >
          <span className="relative z-10">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-5 h-5 border-2 border-slate-950/30 
                  border-t-slate-950 rounded-full animate-spin" />
                Signing in…
              </span>
            ) : "Sign in"}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-white/20 to-emerald-400/0 
            group-hover:translate-x-full transition-transform duration-700" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-cyan-200/50">
        No account?{" "}
        <Link
          to={`/register${redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
          className="text-cyan-400 hover:text-cyan-300 font-medium 
            transition-colors hover:underline underline-offset-2"
        >
          Create one
        </Link>
      </p>
    </AuthShell>
  );
};

// ─── Register Page ───────────────────────────────────────────────────────
export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 6) errs.password = "Minimum 6 characters";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setGlobalError("");
    const result = await register(form);
    setLoading(false);

    if (result.success) navigate(redirect, { replace: true });
    else setGlobalError(result.message);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AuthShell title="Get Started" subtitle="Join the collaboration revolution">
      <form onSubmit={handleSubmit}>
        {globalError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 
            text-rose-300 text-sm flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            {globalError}
          </div>
        )}

        <InputField label="Full Name" type="text" value={form.name}
          onChange={set("name")} placeholder="Alex Chen" error={errors.name} />

        <InputField label="Email" type="email" value={form.email}
          onChange={set("email")} placeholder="you@company.com" error={errors.email} />

        <InputField label="Password" type="password" value={form.password}
          onChange={set("password")} placeholder="Minimum 6 characters" error={errors.password} />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400
            text-slate-950 font-bold text-base
            hover:from-cyan-300 hover:to-emerald-300
            disabled:opacity-50 disabled:cursor-not-allowed 
            transition-all duration-300 ease-out
            shadow-lg shadow-cyan-400/30 hover:shadow-cyan-400/50
            hover:scale-[1.02] active:scale-[0.98]
            relative overflow-hidden group"
        >
          <span className="relative z-10">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-5 h-5 border-2 border-slate-950/30 
                  border-t-slate-950 rounded-full animate-spin" />
                Creating account…
              </span>
            ) : "Create account"}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-white/20 to-emerald-400/0 
            group-hover:translate-x-full transition-transform duration-700" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-cyan-200/50">
        Already have an account?{" "}
        <Link
          to={`/login${redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
          className="text-cyan-400 hover:text-cyan-300 font-medium 
            transition-colors hover:underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

// ─── Forgot Password Page ──────────────────────────────────────────────────
export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [devResetUrl, setDevResetUrl] = useState(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState(null);

  const validate = () => {
    if (!email) return "Email is required";
    if (!/\S+@\S+\.\S+/.test(email)) return "Enter a valid email";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setEmailError(err); return; }
    setEmailError("");
    setGlobalError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSent(true);
      if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
      if (data.emailPreviewUrl) setEmailPreviewUrl(data.emailPreviewUrl);
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong. Please try again.";
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Forgot Password" subtitle="We'll send a reset link to your inbox">
      {sent ? (
        <div className="text-center py-4">
          {/* Success state */}
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-400/15 border border-emerald-400/30
            flex items-center justify-center text-3xl animate-bounce-slow">
            📬
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-cyan-200/60 text-sm leading-relaxed mb-6">
            If <span className="text-cyan-300 font-medium">{email}</span> is registered,
            you'll receive a password reset link shortly. It expires in <strong className="text-cyan-300">10 minutes</strong>.
          </p>

          {/* Ethereal Inbox Link — shown when real test email is sent */}
          {emailPreviewUrl && (
            <div className="mb-6 px-4 py-4 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 text-left">
              <p className="text-cyan-300 text-xs font-mono font-bold mb-2 flex items-center gap-1.5">
                <span>✉️</span> Real Email Sent (SMTP Test)
              </p>
              <p className="text-cyan-200/70 text-xs mb-3 leading-relaxed">
                An actual test email was successfully sent. You can open and view it in the Ethereal inbox:
              </p>
              <a
                href={emailPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2.5 px-4 rounded-xl text-center text-sm font-bold
                  bg-cyan-400/20 border border-cyan-400/40 text-cyan-300
                  hover:bg-cyan-400/30 transition-all duration-200"
              >
                View Ethereal Email →
              </a>
            </div>
          )}

          {/* Dev-mode helper — only shown when backend returns devResetUrl */}
          {devResetUrl && (
            <div className="mb-6 px-4 py-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-left">
              <p className="text-amber-300 text-xs font-mono font-bold mb-2 flex items-center gap-1.5">
                <span>🛠</span> DEV MODE — Reset Link
              </p>
              <p className="text-amber-200/70 text-xs mb-3 leading-relaxed">
                Use this button to directly simulate the email link redirect:
              </p>
              <Link
                to={`/reset-password/${devResetUrl.split("/").pop()}`}
                className="block w-full py-2.5 px-4 rounded-xl text-center text-sm font-bold
                  bg-amber-400/20 border border-amber-400/40 text-amber-300
                  hover:bg-amber-400/30 transition-all duration-200"
              >
                Open Reset Link →
              </Link>
            </div>
          )}

          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 px-4 rounded-xl bg-white/5 border border-cyan-400/20
              text-cyan-300 font-medium text-sm hover:bg-white/10 hover:border-cyan-400/40
              transition-all duration-300"
          >
            ← Back to Sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {globalError && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30
              text-rose-300 text-sm flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              {globalError}
            </div>
          )}

          <p className="text-cyan-200/50 text-sm mb-6 leading-relaxed">
            Enter the email address associated with your account and we'll send you a link to reset your password.
          </p>

          <InputField
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            error={emailError}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400
              text-slate-950 font-bold text-base
              hover:from-cyan-300 hover:to-emerald-300
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300 ease-out
              shadow-lg shadow-cyan-400/30 hover:shadow-cyan-400/50
              hover:scale-[1.02] active:scale-[0.98]
              relative overflow-hidden group"
          >
            <span className="relative z-10">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-5 h-5 border-2 border-slate-950/30
                    border-t-slate-950 rounded-full animate-spin" />
                  Sending…
                </span>
              ) : "Send Reset Link"}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-white/20 to-emerald-400/0
              group-hover:translate-x-full transition-transform duration-700" />
          </button>

          <p className="mt-6 text-center text-sm text-cyan-200/50">
            Remembered it?{" "}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium
              transition-colors hover:underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
};

// ─── Reset Password Page ───────────────────────────────────────────────────
export const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 6) errs.password = "Minimum 6 characters";
    if (!form.confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setGlobalError("");
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, {
        password: form.password,
      });
      // Auto-login: store the token and user returned by the backend
      localStorage.setItem("zaalima_token", data.token);
      localStorage.setItem("zaalima_user", JSON.stringify(data.user));
      updateUser(data.user);
      setSuccess(true);
      // Redirect to dashboard after a brief celebratory pause
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong. Please try again.";
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (success) {
    return (
      <AuthShell title="Password Reset!" subtitle="You're all set — redirecting you now">
        <div className="text-center py-6">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-400/15 border border-emerald-400/30
            flex items-center justify-center text-4xl">
            ✅
          </div>
          <h2 className="text-xl font-bold text-white mb-2">All done!</h2>
          <p className="text-cyan-200/60 text-sm leading-relaxed mb-4">
            Your password has been reset successfully. You're being signed in…
          </p>
          <div className="flex justify-center">
            <span className="inline-block w-6 h-6 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset Password" subtitle="Choose a strong new password">
      <form onSubmit={handleSubmit}>
        {globalError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30
            text-rose-300 text-sm flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            {globalError}
          </div>
        )}

        <InputField
          label="New Password"
          type="password"
          value={form.password}
          onChange={set("password")}
          placeholder="Minimum 6 characters"
          error={errors.password}
        />

        <InputField
          label="Confirm New Password"
          type="password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          placeholder="Re-enter your new password"
          error={errors.confirmPassword}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400
            text-slate-950 font-bold text-base
            hover:from-cyan-300 hover:to-emerald-300
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300 ease-out
            shadow-lg shadow-cyan-400/30 hover:shadow-cyan-400/50
            hover:scale-[1.02] active:scale-[0.98]
            relative overflow-hidden group"
        >
          <span className="relative z-10">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-5 h-5 border-2 border-slate-950/30
                  border-t-slate-950 rounded-full animate-spin" />
                Resetting…
              </span>
            ) : "Reset Password"}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-white/20 to-emerald-400/0
            group-hover:translate-x-full transition-transform duration-700" />
        </button>

        <p className="mt-6 text-center text-sm text-cyan-200/50">
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium
            transition-colors hover:underline underline-offset-2">
            ← Back to Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};
