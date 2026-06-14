import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Zap, Users, Shield, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// ─── Floating shape ───────────────────────────────────────────────────────────
const FloatingShape = ({ className, delay = 0 }) => (
  <div
    className={`absolute rounded-2xl opacity-20 animate-float ${className}`}
    style={{ animationDelay: `${delay}s` }}
  />
);

// ─── Feature bullet ───────────────────────────────────────────────────────────
const Feature = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-3 text-sm">
    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
      <Icon size={14} className="text-white/80" />
    </div>
    <span className="text-white/70">{text}</span>
  </div>
);

// ─── Input field ──────────────────────────────────────────────────────────────
const InputField = ({ label, type: initialType, value, onChange, placeholder, error, id }) => {
  const [showPw, setShowPw] = useState(false);
  const isPw = initialType === "password";
  const type = isPw && showPw ? "text" : initialType;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`input-field ${error ? "error" : ""} ${isPw ? "pr-11" : ""}`}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg
              text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1 animate-fade-in">
          <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

// ─── Auth Shell ───────────────────────────────────────────────────────────────
const AuthShell = ({ title, subtitle, children, isLogin }) => (
  <div className="min-h-screen flex bg-slate-950 overflow-hidden">
    {/* LEFT — Hero panel */}
    <div className="hidden lg:flex flex-col justify-between w-[44%] relative overflow-hidden
      bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-12">
      {/* Floating shapes */}
      <FloatingShape className="w-32 h-32 bg-violet-500 top-20 left-10 rotate-12" delay={0} />
      <FloatingShape className="w-20 h-20 bg-indigo-500 top-48 right-12 -rotate-6" delay={1.5} />
      <FloatingShape className="w-16 h-16 bg-violet-400 bottom-40 left-24 rotate-45" delay={3} />
      <FloatingShape className="w-24 h-24 bg-indigo-400 bottom-20 right-8 -rotate-12" delay={0.8} />

      {/* Orb glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-80 h-80 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm
            flex items-center justify-center text-white font-black text-xl
            border border-white/20">
            Z
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Zaalima</span>
        </div>

        <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
          Your team's work,<br />
          <span className="gradient-text-violet">beautifully organized</span>
        </h2>
        <p className="text-white/50 text-base leading-relaxed mb-10">
          Real-time collaboration, Kanban boards, and powerful workflows — all in one place.
        </p>

        <div className="space-y-4">
          <Feature icon={Zap}      text="Real-time updates across your entire team" />
          <Feature icon={Users}    text="Invite members with role-based permissions" />
          <Feature icon={Shield}   text="Enterprise-grade security and privacy" />
          <Feature icon={Sparkles} text="Beautiful, focused workspace design" />
        </div>
      </div>

      {/* Bottom testimonial */}
      <div className="relative z-10 glass rounded-2xl p-5">
        <p className="text-white/70 text-sm leading-relaxed mb-3">
          "Zaalima transformed how our team collaborates. The real-time boards are a game changer."
        </p>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500
            flex items-center justify-center text-white text-xs font-bold">
            AK
          </div>
          <div>
            <p className="text-white text-xs font-semibold">Alex Kumar</p>
            <p className="text-white/40 text-xs">Lead Engineer, TechCorp</p>
          </div>
        </div>
      </div>
    </div>

    {/* RIGHT — Form panel */}
    <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full
        bg-violet-600/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full
        bg-indigo-600/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[400px] animate-fade-in">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
            flex items-center justify-center text-white font-black text-lg
            shadow-lg shadow-violet-500/30">
            Z
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Zaalima</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1.5">{title}</h1>
          <p className="text-slate-400 text-sm">{subtitle}</p>
        </div>

        {/* Glass card */}
        <div className="glass rounded-2xl p-8 shadow-2xl">
          {children}
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-slate-500">
          {isLogin ? (
            <>No account?{" "}
              <Link to="/register" className="text-violet-400 hover:text-violet-300
                font-semibold transition-colors">
                Create one free →
              </Link>
            </>
          ) : (
            <>Already have an account?{" "}
              <Link to="/login" className="text-violet-400 hover:text-violet-300
                font-semibold transition-colors">
                Sign in →
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  </div>
);

// ─── Submit button ────────────────────────────────────────────────────────────
const SubmitButton = ({ loading, label, loadingLabel }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm
      flex items-center justify-center gap-2
      bg-gradient-to-r from-violet-600 to-indigo-600
      hover:from-violet-500 hover:to-indigo-500
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200
      shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:shadow-xl
      group active:scale-[0.98]"
  >
    {loading ? (
      <>
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        {loadingLabel}
      </>
    ) : (
      <>
        {label}
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </>
    )}
  </button>
);

// ─── Error banner ─────────────────────────────────────────────────────────────
const ErrorBanner = ({ message }) => (
  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20
    text-red-400 text-sm flex items-start gap-2.5 animate-fade-in">
    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
    {message}
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
    if (result.success) navigate("/");
    else setGlobalError(result.message);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your workspace" isLogin>
      <form onSubmit={handleSubmit} className="space-y-5">
        {globalError && <ErrorBanner message={globalError} />}
        <InputField id="login-email"    label="Email"    type="email"    value={form.email}
          onChange={set("email")}    placeholder="you@company.com" error={errors.email} />
        <InputField id="login-password" label="Password" type="password" value={form.password}
          onChange={set("password")} placeholder="••••••••"          error={errors.password} />
        <div className="pt-1">
          <SubmitButton loading={loading} label="Sign in" loadingLabel="Signing in…" />
        </div>
      </form>
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
    if (!form.name.trim())    errs.name = "Name is required";
    if (!form.email)          errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.password)       errs.password = "Password is required";
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
      <form onSubmit={handleSubmit} className="space-y-5">
        {globalError && <ErrorBanner message={globalError} />}
        <InputField id="reg-name"     label="Full name" type="text"     value={form.name}
          onChange={set("name")}     placeholder="Alex Chen"          error={errors.name} />
        <InputField id="reg-email"    label="Email"     type="email"    value={form.email}
          onChange={set("email")}    placeholder="you@company.com"    error={errors.email} />
        <InputField id="reg-password" label="Password"  type="password" value={form.password}
          onChange={set("password")} placeholder="Min. 6 characters"  error={errors.password} />
        <div className="pt-1">
          <SubmitButton loading={loading} label="Create account" loadingLabel="Creating…" />
        </div>
      </form>
    </AuthShell>
  );
};
