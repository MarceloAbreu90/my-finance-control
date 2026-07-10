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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fonte da verdade agora é o cookie de sessão httpOnly no servidor —
    // consultamos /me para saber se já existe uma sessão válida.
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, senha: string, remember: boolean) => {
    const u = await api.login(email, senha, remember);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    api.logout().finally(() => setUser(null));
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
