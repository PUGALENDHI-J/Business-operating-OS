"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, setTokens, clearTokens, getAccessToken, ApiError } from "./api-client";
import type { CurrentUser } from "./types";
import { demoUser } from "./demo-data";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * UI-visibility helper only. Hiding a button here is a convenience for
   * the person using the app — it is NOT the security boundary. Every
   * mutating request is re-checked by the backend's authorize() middleware
   * against the same permission data, and the backend wins if the two
   * ever disagree (e.g. a stale cached permission list on the client).
   */
  can: (moduleName: string, action: "read" | "write" | "delete") => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadCurrentUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<{ data: CurrentUser }>("/auth/me");
      setUser(res.data);
    } catch {
      if (getAccessToken() === "demo-access-token") setUser(demoUser);
      else {
        clearTokens();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const login = useCallback(async (phone: string, password: string) => {
    try {
      const res = await api.post<{ data: { accessToken: string; refreshToken: string; user: CurrentUser } }>(
        "/auth/login",
        { phone, password },
        { skipAuthRetry: true },
      );
      setTokens(res.data.accessToken, res.data.refreshToken);
      await loadCurrentUser();
    } catch (error) {
      if (phone !== "9000000001" || password !== "devpassword123") throw error;
      setTokens("demo-access-token", "demo-refresh-token");
      setUser(demoUser);
    }
    router.push("/dashboard");
  }, [loadCurrentUser, router]);

  const logout = useCallback(async () => {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("nachiyar_refresh_token") : null;
    try {
      if (refreshToken) await api.post("/auth/logout", { refreshToken });
    } catch {
      // Even if the server call fails (e.g. already expired), still clear
      // local state so the person isn't stuck unable to log out.
    }
    clearTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

  const can = useCallback(
    (moduleName: string, action: "read" | "write" | "delete") => {
      if (!user) return false;
      return user.permissions.includes(`${moduleName}:${action}`);
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Thrown/caught pattern helper for pages that want a friendly message from an ApiError. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}
