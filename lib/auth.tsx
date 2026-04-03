"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { auth as authApi, saveTokens, clearTokens, TOKEN_KEYS } from "./api";

interface UserInfo {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserInfo | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (username: string, email: string, password: string, firstName?: string, lastName?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEYS.user);
    const token = localStorage.getItem(TOKEN_KEYS.access);
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
        setIsLoggedIn(true);
      } catch {}
    }
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
      const message = err instanceof Error ? err.message : "Login failed";
      return { ok: false, error: message };
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    firstName = '',
    lastName = '',
  ) => {
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
      const message = err instanceof Error ? err.message : "Registration failed";
      return { ok: false, error: message };
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem(TOKEN_KEYS.refresh);
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {}
    }
    clearTokens();
    setIsLoggedIn(false);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
