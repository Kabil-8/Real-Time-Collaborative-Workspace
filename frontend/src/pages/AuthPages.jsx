import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AuthCard({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <div className="mb-6">
          <div className="text-brand-700 text-2xl font-bold">Zaalima</div>
          <h1 className="mt-2 text-xl font-semibold">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    try { await login(form.email, form.password); navigate("/"); }
    catch (err) { setError(err?.response?.data?.error?.message || "Login failed"); }
    finally { setLoading(false); }
  }

  return (
    <AuthCard title="Sign in">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={loading} className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        No account? <Link to="/register" className="text-brand-600 hover:text-brand-700">Create one</Link>
      </p>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    try { await register(form.name, form.email, form.password); navigate("/"); }
    catch (err) { setError(err?.response?.data?.error?.message || "Registration failed"); }
    finally { setLoading(false); }
  }

  return (
    <AuthCard title="Create your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          <p className="mt-1 text-xs text-slate-500">Minimum 8 characters</p>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={loading} className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already have an account? <Link to="/login" className="text-brand-600 hover:text-brand-700">Sign in</Link>
      </p>
    </AuthCard>
  );
}