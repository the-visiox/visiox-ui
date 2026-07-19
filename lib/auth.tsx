"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  auth as authApi,
  saveTokens,
  clearTokens,
  refreshAccessToken,
  TOKEN_KEYS,
  API_BASE_URL,
} from "./api";

function isTokenValid(token: string): boolean {
  try {
    const segment = token.split(".")[1];
    if (!segment) return false;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function formatAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const isNetwork =
    raw === "Failed to fetch" ||
    raw === "NetworkError when attempting to fetch resource." ||
    raw.startsWith("Load failed"); // Safari
  if (isNetwork) {
    return [
      `Cannot reach the API (${API_BASE_URL}).`,
      "Start the backend: cd visiox ? python manage.py runserver 0.0.0.0:8000.",
      "Or set NEXT_PUBLIC_API_URL in visiox-ui/.env.local.",
      "If you use a LAN URL for the site, add it to Django CORS_ALLOWED_ORIGINS.",
    ].join(" ");
  }
  return raw;
}

interface UserInfo {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  authReady: boolean;
  user: UserInfo | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      const stored = localStorage.getItem(TOKEN_KEYS.user);
      const token = localStorage.getItem(TOKEN_KEYS.access);
      const refresh = localStorage.getItem(TOKEN_KEYS.refresh);
      let hasValidSession = Boolean(token && isTokenValid(token));

      if (!hasValidSession && refresh) {
        hasValidSession = await refreshAccessToken();
      }
      if (cancelled) return;

      if (stored && hasValidSession) {
        try {
          setUser(JSON.parse(stored));
          setIsLoggedIn(true);
        } catch {
          /* ignore */
        }
      } else if (!hasValidSession) {
        clearTokens();
      }
      setAuthReady(true);
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await authApi.login(email, password);
      saveTokens(data.access_token, data.refresh_token);
      const userInfo: UserInfo = {
        user_id: data.user_id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
      };
      localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(userInfo));
      setUser(userInfo);
      setIsLoggedIn(true);
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: formatAuthError(err) };
    }
  };

  const register = async (username: string, email: string, password: string, firstName = "", lastName = "") => {
    try {
      const data = await authApi.register(username, email, password, firstName, lastName);
      saveTokens(data.access_token, data.refresh_token);
      const userInfo: UserInfo = {
        user_id: data.user_id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
      };
      localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(userInfo));
      setUser(userInfo);
      setIsLoggedIn(true);
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: formatAuthError(err) };
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem(TOKEN_KEYS.refresh);
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        /* ignore */
      }
    }
    clearTokens();
    setIsLoggedIn(false);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, authReady, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
