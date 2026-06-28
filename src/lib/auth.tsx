import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api/client";
import type { Usuario } from "./api/types";

interface AuthState {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, senha: string, remember: boolean) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);
const KEY = "mfc:session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw) as Usuario);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, senha: string, remember: boolean) => {
    const u = await api.login(email, senha);
    setUser(u);
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}