import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const InputField = ({ label, type, value, onChange, placeholder, error }) => (
  <div className="mb-5">
    <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-4 py-3 rounded-xl bg-slate-800/60 border text-white placeholder-slate-500
        focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all
        ${error ? "border-red-500" : "border-slate-700"}`}
    />
    {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
  </div>
);

const AuthShell = ({ title, subtitle, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
    {/* Ambient glow */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-indigo-600/8 rounded-full blur-3xl" />
    </div>

    <div className="relative w-full max-w-md">
      {/* Logo mark */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/30">
            Z
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">Zaalima</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
        <p className="text-slate-400 text-sm">{subtitle}</p>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {children}
      </div>
    </div>
  </div>
);

// ─── Login Page ───────────────────────────────────────────────────────────────
export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

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
      navigate("/");
    } else {
      setGlobalError(result.message);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your workspace">
      <form onSubmit={handleSubmit}>
        {globalError && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {globalError}
          </div>
        )}
        <InputField label="Email" type="email" value={form.email} onChange={set("email")}
          placeholder="you@company.com" error={errors.email} />
        <InputField label="Password" type="password" value={form.password} onChange={set("password")}
          placeholder="••••••••" error={errors.password} />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
            text-white font-semibold hover:from-violet-500 hover:to-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
            shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        No account?{" "}
        <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
};

// ─── Register Page ────────────────────────────────────────────────────────────
export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
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

    if (result.success) navigate("/");
    else setGlobalError(result.message);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AuthShell title="Create your account" subtitle="Start collaborating with your team today">
      <form onSubmit={handleSubmit}>
        {globalError && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {globalError}
          </div>
        )}
        <InputField label="Full name" type="text" value={form.name} onChange={set("name")}
          placeholder="Alex Chen" error={errors.name} />
        <InputField label="Email" type="email" value={form.email} onChange={set("email")}
          placeholder="you@company.com" error={errors.email} />
        <InputField label="Password" type="password" value={form.password} onChange={set("password")}
          placeholder="Min. 6 characters" error={errors.password} />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
            text-white font-semibold hover:from-violet-500 hover:to-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
            shadow-lg shadow-violet-500/20"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};
