import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { api, saveToken, clearToken, getToken } from "./api";

type User = any;
const Ctx = createContext<{
  user: User | null; loading: boolean;
  login: (e: string, p: string) => Promise<void>;
  signup: (n: string, e: string, p: string) => Promise<void>;
  googleLogin: (session_id: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}>({ user: null, loading: true,
  login: async () => {}, signup: async () => {}, googleLogin: async () => {},
  logout: async () => {}, refresh: async () => {} });

async function detectGoogleSessionId(): Promise<string | null> {
  if (Platform.OS !== "web") return null;
  try {
    const w: any = window;
    const hash = w.location?.hash || "";
    const search = w.location?.search || "";
    const parts = new URLSearchParams((hash.startsWith("#") ? hash.slice(1) : hash) + "&" + search.slice(1));
    const sid = parts.get("session_id");
    if (sid) {
      w.history.replaceState(null, "", w.location.pathname);
      return sid;
    }
  } catch {}
  return null;
}

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

  useEffect(() => {
    (async () => {
      const sid = await detectGoogleSessionId();
      if (sid) {
        try {
          const res = await api.googleSession(sid);
          await saveToken(res.token); setUser(res.user);
          setLoading(false); return;
        } catch (e) { console.warn("google-session err", e); }
      }
      await refresh();
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    await saveToken(res.token); setUser(res.user);
  };
  const signup = async (name: string, email: string, password: string) => {
    const res = await api.signup(name, email, password);
    await saveToken(res.token); setUser(res.user);
  };
  const googleLogin = async (session_id: string) => {
    const res = await api.googleSession(session_id);
    await saveToken(res.token); setUser(res.user);
  };
  const logout = async () => { await clearToken(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, signup, googleLogin, logout, refresh }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
