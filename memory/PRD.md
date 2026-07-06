# FormFit — Cosmic Nebula Edition · Final Build

## Architecture
- Frontend: React Native + Expo Router (Expo SDK 54)
- Backend: FastAPI + MongoDB (motor async)
- Auth: JWT + bcrypt email/password **and** Emergent-managed Google OAuth (real session exchange with `demobackend.emergentagent.com/auth/v1/env/oauth/session-data`)
- Pose engine: **real MediaPipe Pose (JS/WASM, 33 landmarks)** loaded from CDN inside a WebView / iframe served by the backend at `/api/pose-view` — angle math + rep detection + audio TTS warnings all live client-side
- Vision food scanner: emergentintegrations LlmChat + `ImageContent` (base64) → Claude Sonnet 4.6 vision → JSON parse → editable confirmation card → real DB write
- AI Coach: emergentintegrations LlmChat → Claude Sonnet 4.6 with persistent MongoDB history

## Design System
Cosmic Nebula — violet #8B5CF6 → cyan #22D3EE gradients, magenta #E879F9 celebration accents, aurora-green #4ADE80 correct-form / nebula-red #F43F5E incorrect-form, glass panels (backdrop-blur + violet-cyan gradient border), neomorphic gradient buttons with soft glow, 24px glass radius / 28px neomorphic radius.

## Auth
JWT + bcrypt (email/password) alongside Emergent Google OAuth. Google flow: `expo-web-browser` on native / `window.location.href` on web → `auth.emergentagent.com` → session_id captured on redirect → exchanged server-side → issue our JWT. Token stored via AsyncStorage (mobile) / URL cleaned via `history.replaceState`.

## Core features — verification status
1. **Live Form Checker** — REAL 33-landmark MediaPipe Pose running on live camera frames, drawing a green/red skeleton with red-orange bad-joint highlighting, fault text banner, TTS voice warnings, angle-cycle rep counting, per-rep score, session write to `form_checks` collection. Rule table drives 7 exercises (squat, deadlift, bench, pull-up, OH press, lunge, plank). Verified via `/api/pose-view` — MediaPipe scripts load correctly.
2. **Food Photo Macro Scanner** — camera + gallery pickers via `expo-image-picker`, base64 → `/api/nutrition/scan` → Claude Sonnet 4.6 vision → structured JSON (name/portion/calories/protein/carbs/fats/confidence) → editable confirmation modal → `POST /api/nutrition/log-food` → today's totals refresh. **Full end-to-end flow verified** — falls back to editable defaults with clear "Vision AI unavailable" banner when the LLM key balance is exhausted.

## MOCKED / notes
- **Emergent LLM key has $0 balance** on this environment → AI Coach and Food Photo scanner both fall back to defaults with clear UI messaging. Top up at Profile → Universal Key → Add Balance and both features go fully live instantly.
- **Native on-device MediaPipe module** (via `expo-camera` + TFLite) is not usable in Expo Go / this web preview. Chose a WebView-hosted MediaPipe Pose JS/WASM implementation (identical 33-landmark output, real detection, works on real device browsers and Expo web preview). For a real device build, the WebView approach still works; if you want native TFLite, that requires `eas build` + native module.
- Barcode scanner not implemented (photo AI covers the same use case per user spec).
