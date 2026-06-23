import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("zaalima_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("zaalima_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("zaalima_user", JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem("zaalima_token");
        localStorage.removeItem("zaalima_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    setError(null);
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      localStorage.setItem("zaalima_token", data.token);
      localStorage.setItem("zaalima_user", JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed.";
      setError(message);
      return { success: false, message };
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setError(null);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("zaalima_token", data.token);
      localStorage.setItem("zaalima_user", JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed.";
      setError(message);
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("zaalima_token");
    localStorage.removeItem("zaalima_user");
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem("zaalima_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, setError, register, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
