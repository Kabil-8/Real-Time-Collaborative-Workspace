import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((res) => setUser(res.data.data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token, user } = res.data.data;
    localStorage.setItem("token", token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    const { token, user } = res.data.data;
    localStorage.setItem("token", token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const updateUser = useCallback(async (patch) => {
    const res = await api.patch("/auth/profile", patch);
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}