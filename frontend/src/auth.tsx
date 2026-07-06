import React, { createContext, useContext, useEffect, useState } from "react";
import { api, saveToken, clearToken, getToken } from "./api";

type User = any;
const Ctx = createContext<{
  user: User | null; loading: boolean;
  login: (e: string, p: string) => Promise<void>;
  signup: (n: string, e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}>({ user: null, loading: true, login: async () => {}, signup: async () => {}, logout: async () => {}, refresh: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const t = await getToken();
      if (!t) { setUser(null); return; }
      const me = await api.me();
      setUser(me);
    } catch { setUser(null); await clearToken(); }
  };

  useEffect(() => { (async () => { await refresh(); setLoading(false); })(); }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    await saveToken(res.token); setUser(res.user);
  };
  const signup = async (name: string, email: string, password: string) => {
    const res = await api.signup(name, email, password);
    await saveToken(res.token); setUser(res.user);
  };
  const logout = async () => { await clearToken(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, signup, logout, refresh }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
