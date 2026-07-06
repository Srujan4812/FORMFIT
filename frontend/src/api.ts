import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function req(path: string, opts: RequestInit = {}) {
  const token = await AsyncStorage.getItem("ff_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
  return data;
}

export const api = {
  signup: (name: string, email: string, password: string) =>
    req("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req("/auth/me"),
  updateProfile: (b: any) => req("/profile", { method: "PUT", body: JSON.stringify(b) }),

  exercises: (muscle?: string, q?: string) => {
    const p = new URLSearchParams();
    if (muscle) p.append("muscle", muscle);
    if (q) p.append("q", q);
    return req(`/exercises${p.toString() ? "?" + p.toString() : ""}`);
  },
  exercise: (id: string) => req(`/exercises/${id}`),
  split: (s: string) => req(`/splits/${s}`),
  selectSplit: (s: string) => req("/splits/select", { method: "POST", body: JSON.stringify({ split: s }) }),

  workouts: () => req("/workouts"),
  createWorkout: (b: any) => req("/workouts", { method: "POST", body: JSON.stringify(b) }),

  nutritionToday: () => req("/nutrition/today"),
  logNutrition: (b: any) => req("/nutrition", { method: "POST", body: JSON.stringify(b) }),

  logForm: (b: any) => req("/form-check", { method: "POST", body: JSON.stringify(b) }),
  formHistory: () => req("/form-check/history"),

  logRecovery: (b: any) => req("/recovery", { method: "POST", body: JSON.stringify(b) }),
  latestRecovery: () => req("/recovery/latest"),

  fitnessScore: () => req("/fitness-score"),
  heatmap: () => req("/analytics/heatmap"),
  muscleActivation: () => req("/analytics/muscle-activation"),
  plateau: () => req("/analytics/plateau"),

  achievements: () => req("/achievements"),

  chat: (session_id: string, message: string) =>
    req("/coach/chat", { method: "POST", body: JSON.stringify({ session_id, message }) }),
  chatHistory: (session_id: string) => req(`/coach/history/${session_id}`),
};

export async function saveToken(t: string) { await AsyncStorage.setItem("ff_token", t); }
export async function clearToken() { await AsyncStorage.removeItem("ff_token"); }
export async function getToken() { return AsyncStorage.getItem("ff_token"); }
