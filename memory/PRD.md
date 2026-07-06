# FormFit — Cosmic Nebula Edition

Premium AI-powered fitness companion. React Native + Expo (frontend) · FastAPI + MongoDB (backend).

## Design System
Cosmic Nebula — deep-space indigo bg, glass panels (backdrop blur + violet-cyan gradient border),
neomorphic controls, violet #8B5CF6 → cyan #22D3EE primary gradient, magenta #E879F9 for celebrations,
aurora green #4ADE80 correct-form, nebula red #F43F5E incorrect-form.

## Screens delivered
1. Login / Sign Up (email + password, JWT)
2. Home Dashboard (fitness score gauge, readiness, today's mission, quick access grid)
3. Weekly Grid + Split selector modal (PPL, Upper/Lower, Bro, Full Body)
4. Exercise Library (search + muscle-group chips, form cues)
5. Universal AI Form-Check HUD (live skeletal overlay w/ 33 landmarks, rep counter, form % live, warning banner, Ghost overlay toggle)
6. Post-Workout Transmission (form score, rep timeline bars, AI insights, PR celebration)
7. Fitness Score Deep Dive (composite gauge, 5 sub-scores, 8-week trend bars, AI tip)
8. Nutrition tracker (Cosmic Macros ring, macro bars, quick-log foods, hydration)
9. AI Coach Chat (Claude Sonnet 4.6 via emergentintegrations, pulsing avatar orb, suggestion chips, message history)
10. Recovery Check-In (soreness / sleep / energy sliders → Light/Moderate/Full recommendation)
11. Analytics (mini stats, 8-week consistency heatmap, muscle activation, plateau forecast historical + projected)
12. Galactic Achievements (8 badges: locked = dimmed, unlocked = glowing)
13. Profile (metrics editor, sex + goal chips, menu into all detail screens, sign out)

## Backend endpoints (all `/api/*`, per-user auth guarded)
`POST /auth/signup`, `POST /auth/login`, `GET /auth/me`, `PUT /profile`
`GET /exercises[?muscle&q]`, `GET /exercises/:id`
`GET /splits/:split`, `POST /splits/select`
`POST /workouts`, `GET /workouts`
`POST /nutrition`, `GET /nutrition/today`
`POST /form-check`, `GET /form-check/history`
`POST /recovery`, `GET /recovery/latest`
`GET /fitness-score` (5-weighted sub-score composite + 8-week trend + weakest-tip)
`GET /analytics/heatmap`, `/muscle-activation`, `/plateau`
`GET /achievements`
`POST /coach/chat`, `GET /coach/history/:session_id`

## Data model (MongoDB collections)
users · workouts · form_checks · nutrition · recovery · coach_msgs
All queries scoped by `user_id` on the server.

## MOCKED / notes
- **Pose detection** — the skeletal overlay in Form-Check is a driven simulation (33-landmark schema, connections match MediaPipe). Wiring to real on-device MediaPipe/TFLite is one component swap in `FormCheckScreen.tsx`.
- **Emergent LLM key** — the account has 0 budget so the coach falls back to a canned reply. Top up in Profile → Universal Key → Add Balance and Claude Sonnet 4.6 will respond live.
- **Barcode / photo food AI** — quick-log uses a fixed food list; UI/data model ready for barcode + AI-food swap.
- **Animated exercise demo & voice narration** — deferred, out of budget scope.

## Auth
JWT + bcrypt. Token stored in AsyncStorage. All protected endpoints require `Authorization: Bearer <token>`.
Emergent-managed Google OAuth **not** included (user did not request it explicitly).
