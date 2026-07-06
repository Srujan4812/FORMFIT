from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

app = FastAPI()
api = APIRouter(prefix="/api")

# ---------- Models ----------
def now_utc():
    return datetime.now(timezone.utc).isoformat()

class SignUpReq(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    body_fat_percent: Optional[float] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    current_split: Optional[str] = None
    goal: Optional[str] = None  # cut / maintain / bulk

class WorkoutIn(BaseModel):
    split_day: str
    exercises: List[Dict[str, Any]] = []
    duration_min: int = 0
    calories_burned: int = 0
    notes: Optional[str] = None

class NutritionMeal(BaseModel):
    name: str
    calories: int
    protein: float = 0
    carbs: float = 0
    fats: float = 0
    time: Optional[str] = None

class NutritionIn(BaseModel):
    date: str
    meals: List[NutritionMeal] = []
    water_ml: int = 0

class FormCheckIn(BaseModel):
    exercise_id: str
    rep_scores: List[float] = []
    avg_score: float = 0
    issues: List[str] = []

class RecoveryIn(BaseModel):
    soreness: int  # 1-10
    sleep_hours: float
    energy: int  # 1-10

class ChatReq(BaseModel):
    session_id: str
    message: str

class SplitReq(BaseModel):
    split: str  # push_pull_legs, upper_lower, bro, full_body, custom

# ---------- Auth ----------
def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def make_token(uid: str) -> str:
    return jwt.encode({"uid": uid, "exp": datetime.now(timezone.utc) + timedelta(days=30)}, JWT_SECRET, algorithm="HS256")

async def get_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    tok = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(tok, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["uid"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def user_public(u: dict) -> dict:
    return {k: v for k, v in u.items() if k not in ("_id", "password_hash")}

# ---------- Routes ----------
@api.get("/")
async def root():
    return {"message": "FormFit API"}

@api.post("/auth/signup")
async def signup(body: SignUpReq):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "name": body.name,
        "email": body.email.lower(),
        "password_hash": hash_pw(body.password),
        "height_cm": None, "weight_kg": None, "body_fat_percent": None,
        "age": None, "sex": None, "current_split": "push_pull_legs",
        "goal": "maintain",
        "streak": 0,
        "created_at": now_utc(),
    }
    await db.users.insert_one(doc)
    return {"token": make_token(uid), "user": user_public(doc)}

@api.post("/auth/login")
async def login(body: LoginReq):
    u = await db.users.find_one({"email": body.email.lower()})
    if not u or not verify_pw(body.password, u.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    return {"token": make_token(u["id"]), "user": user_public(u)}

@api.get("/auth/me")
async def me(user=Depends(get_user)):
    return user

@api.put("/profile")
async def update_profile(body: ProfileUpdate, user=Depends(get_user)):
    upd = {k: v for k, v in body.dict().items() if v is not None}
    if upd:
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return u

# ----- Exercise library (seeded) -----
EXERCISES_SEED = [
    {"id": "sq", "name": "Barbell Back Squat", "muscle_group": "Legs", "equipment": "Barbell",
     "cues": ["Chest up", "Knees track over toes", "Depth: hip crease below knee"],
     "form_rules": {"knee_angle_min": 70, "knee_angle_max": 175, "back_angle_min": 45},
     "difficulty": "Advanced"},
    {"id": "dl", "name": "Conventional Deadlift", "muscle_group": "Back", "equipment": "Barbell",
     "cues": ["Neutral spine", "Bar over midfoot", "Drive floor away"],
     "form_rules": {"hip_hinge": True, "back_neutral": True}, "difficulty": "Advanced"},
    {"id": "bp", "name": "Bench Press", "muscle_group": "Chest", "equipment": "Barbell",
     "cues": ["Scapula retracted", "Bar to lower chest", "Wrists stacked"],
     "form_rules": {"elbow_angle_bottom": 90}, "difficulty": "Intermediate"},
    {"id": "pu", "name": "Pull-Up", "muscle_group": "Back", "equipment": "Bodyweight",
     "cues": ["Chest to bar", "Full ROM", "Controlled descent"],
     "form_rules": {"elbow_angle_top": 45, "elbow_angle_bottom": 170}, "difficulty": "Intermediate"},
    {"id": "lg", "name": "Walking Lunge", "muscle_group": "Legs", "equipment": "Dumbbell",
     "cues": ["Vertical torso", "Front knee 90°", "Step long enough"],
     "form_rules": {"knee_angle_front": 90}, "difficulty": "Beginner"},
    {"id": "op", "name": "Overhead Press", "muscle_group": "Shoulders", "equipment": "Barbell",
     "cues": ["Glutes tight", "Bar path vertical", "Lockout overhead"],
     "form_rules": {"elbow_angle_top": 175}, "difficulty": "Intermediate"},
    {"id": "pl", "name": "Plank", "muscle_group": "Core", "equipment": "Bodyweight",
     "cues": ["Neutral spine", "Glutes engaged", "Shoulders over elbows"],
     "form_rules": {"hip_angle": 175}, "difficulty": "Beginner"},
    {"id": "rd", "name": "Romanian Deadlift", "muscle_group": "Legs", "equipment": "Barbell",
     "cues": ["Push hips back", "Slight knee bend", "Bar close to legs"],
     "form_rules": {"hip_hinge": True}, "difficulty": "Intermediate"},
    {"id": "rw", "name": "Barbell Row", "muscle_group": "Back", "equipment": "Barbell",
     "cues": ["Flat back", "Pull to lower ribs", "Elbows tight"],
     "form_rules": {"torso_angle": 45}, "difficulty": "Intermediate"},
    {"id": "cu", "name": "Bicep Curl", "muscle_group": "Arms", "equipment": "Dumbbell",
     "cues": ["Elbows pinned", "Full contraction", "Slow eccentric"],
     "form_rules": {"elbow_angle_top": 40}, "difficulty": "Beginner"},
    {"id": "tr", "name": "Triceps Pushdown", "muscle_group": "Arms", "equipment": "Cable",
     "cues": ["Elbows fixed", "Full lockout", "Neutral wrist"],
     "form_rules": {"elbow_angle_bottom": 175}, "difficulty": "Beginner"},
    {"id": "hp", "name": "Hip Thrust", "muscle_group": "Legs", "equipment": "Barbell",
     "cues": ["Chin tucked", "Glute squeeze at top", "Ribs down"],
     "form_rules": {"hip_extension": 180}, "difficulty": "Intermediate"},
]

@api.get("/exercises")
async def list_exercises(muscle: Optional[str] = None, q: Optional[str] = None):
    items = EXERCISES_SEED
    if muscle and muscle.lower() != "all":
        items = [e for e in items if e["muscle_group"].lower() == muscle.lower()]
    if q:
        ql = q.lower()
        items = [e for e in items if ql in e["name"].lower()]
    return items

@api.get("/exercises/{exercise_id}")
async def get_exercise(exercise_id: str):
    ex = next((e for e in EXERCISES_SEED if e["id"] == exercise_id), None)
    if not ex:
        raise HTTPException(404, "Not found")
    return ex

# ----- Splits -----
SPLIT_TEMPLATES = {
    "push_pull_legs": [
        {"day": "Mon", "label": "Push", "exercises": ["bp", "op", "tr"]},
        {"day": "Tue", "label": "Pull", "exercises": ["pu", "rw", "cu"]},
        {"day": "Wed", "label": "Legs", "exercises": ["sq", "rd", "lg"]},
        {"day": "Thu", "label": "Push", "exercises": ["bp", "op", "tr"]},
        {"day": "Fri", "label": "Pull", "exercises": ["pu", "rw", "cu"]},
        {"day": "Sat", "label": "Legs", "exercises": ["sq", "hp", "lg"]},
        {"day": "Sun", "label": "Rest", "exercises": []},
    ],
    "upper_lower": [
        {"day": "Mon", "label": "Upper", "exercises": ["bp", "rw", "op", "cu"]},
        {"day": "Tue", "label": "Lower", "exercises": ["sq", "rd", "lg"]},
        {"day": "Wed", "label": "Rest", "exercises": []},
        {"day": "Thu", "label": "Upper", "exercises": ["pu", "bp", "tr"]},
        {"day": "Fri", "label": "Lower", "exercises": ["dl", "hp", "lg"]},
        {"day": "Sat", "label": "Rest", "exercises": []},
        {"day": "Sun", "label": "Rest", "exercises": []},
    ],
    "bro": [
        {"day": "Mon", "label": "Chest", "exercises": ["bp"]},
        {"day": "Tue", "label": "Back", "exercises": ["pu", "rw", "dl"]},
        {"day": "Wed", "label": "Legs", "exercises": ["sq", "lg", "hp"]},
        {"day": "Thu", "label": "Shoulders", "exercises": ["op"]},
        {"day": "Fri", "label": "Arms", "exercises": ["cu", "tr"]},
        {"day": "Sat", "label": "Core", "exercises": ["pl"]},
        {"day": "Sun", "label": "Rest", "exercises": []},
    ],
    "full_body": [
        {"day": "Mon", "label": "Full Body", "exercises": ["sq", "bp", "rw"]},
        {"day": "Tue", "label": "Rest", "exercises": []},
        {"day": "Wed", "label": "Full Body", "exercises": ["dl", "op", "pu"]},
        {"day": "Thu", "label": "Rest", "exercises": []},
        {"day": "Fri", "label": "Full Body", "exercises": ["sq", "bp", "rw"]},
        {"day": "Sat", "label": "Rest", "exercises": []},
        {"day": "Sun", "label": "Rest", "exercises": []},
    ],
}

@api.get("/splits/{split}")
async def get_split(split: str):
    tpl = SPLIT_TEMPLATES.get(split)
    if not tpl:
        raise HTTPException(404, "Split not found")
    ex_map = {e["id"]: e for e in EXERCISES_SEED}
    out = []
    for d in tpl:
        out.append({
            "day": d["day"], "label": d["label"],
            "exercises": [{"id": ex_map[eid]["id"], "name": ex_map[eid]["name"],
                           "sets": 4, "reps": "8-10", "rest_sec": 90,
                           "muscle_group": ex_map[eid]["muscle_group"]}
                          for eid in d["exercises"] if eid in ex_map]
        })
    return out

@api.post("/splits/select")
async def select_split(body: SplitReq, user=Depends(get_user)):
    if body.split not in SPLIT_TEMPLATES:
        raise HTTPException(400, "Invalid split")
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_split": body.split}})
    return {"ok": True, "current_split": body.split}

# ----- Workouts -----
@api.post("/workouts")
async def create_workout(body: WorkoutIn, user=Depends(get_user)):
    wid = str(uuid.uuid4())
    doc = {"id": wid, "user_id": user["id"], "date": now_utc(), **body.dict()}
    await db.workouts.insert_one(doc)
    # streak
    await db.users.update_one({"id": user["id"]}, {"$inc": {"streak": 1}})
    return {k: v for k, v in doc.items() if k != "_id"}

@api.get("/workouts")
async def list_workouts(user=Depends(get_user)):
    items = await db.workouts.find({"user_id": user["id"]}, {"_id": 0}).sort("date", -1).to_list(200)
    return items

# ----- Nutrition -----
@api.post("/nutrition")
async def log_nutrition(body: NutritionIn, user=Depends(get_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], **body.dict()}
    await db.nutrition.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api.get("/nutrition/today")
async def nutrition_today(user=Depends(get_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    items = await db.nutrition.find({"user_id": user["id"], "date": today}, {"_id": 0}).to_list(50)
    calories = sum(sum(m["calories"] for m in it.get("meals", [])) for it in items)
    protein = sum(sum(m.get("protein", 0) for m in it.get("meals", [])) for it in items)
    carbs = sum(sum(m.get("carbs", 0) for m in it.get("meals", [])) for it in items)
    fats = sum(sum(m.get("fats", 0) for m in it.get("meals", [])) for it in items)
    water = sum(it.get("water_ml", 0) for it in items)
    meals = [m for it in items for m in it.get("meals", [])]
    return {"calories": calories, "protein": protein, "carbs": carbs, "fats": fats,
            "water_ml": water, "meals": meals}

# ----- Form Check -----
@api.post("/form-check")
async def log_form(body: FormCheckIn, user=Depends(get_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "timestamp": now_utc(), **body.dict()}
    await db.form_checks.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api.get("/form-check/history")
async def form_history(user=Depends(get_user)):
    items = await db.form_checks.find({"user_id": user["id"]}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return items

# ----- Recovery -----
@api.post("/recovery")
async def log_recovery(body: RecoveryIn, user=Depends(get_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "date": now_utc(), **body.dict()}
    await db.recovery.insert_one(doc)
    # Recommendation
    score = (body.sleep_hours * 10 + body.energy * 5 - body.soreness * 3) / 2
    if score >= 40:
        rec = "Full"
    elif score >= 25:
        rec = "Moderate"
    else:
        rec = "Light"
    return {"recommendation": rec, "score": round(score, 1)}

@api.get("/recovery/latest")
async def latest_recovery(user=Depends(get_user)):
    item = await db.recovery.find_one({"user_id": user["id"]}, {"_id": 0}, sort=[("date", -1)])
    return item or {}

# ----- Fitness Score -----
@api.get("/fitness-score")
async def fitness_score(user=Depends(get_user)):
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    workouts = await db.workouts.count_documents({"user_id": user["id"]})
    forms = await db.form_checks.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    avg_form = sum(f.get("avg_score", 0) for f in forms) / len(forms) if forms else 70

    # Body composition (35%): based on body fat range
    bf = u.get("body_fat_percent") or 20
    sex = (u.get("sex") or "male").lower()
    ideal_bf = 12 if sex == "male" else 22
    body_comp = max(0, 100 - abs(bf - ideal_bf) * 4)

    # Frame (15%): BMI proxy
    h = (u.get("height_cm") or 175) / 100
    w = u.get("weight_kg") or 75
    bmi = w / (h * h) if h > 0 else 22
    frame = max(0, 100 - abs(bmi - 23) * 5)

    # Functional strength (20%): from workouts count
    strength = min(100, workouts * 5 + 40)

    # Consistency (15%): streak
    streak = u.get("streak", 0)
    consistency = min(100, streak * 4 + 30)

    # AI Form (15%)
    form = avg_form

    total = round(body_comp * 0.35 + frame * 0.15 + strength * 0.20 + consistency * 0.15 + form * 0.15, 1)

    if total < 40:
        category = "Beginner"
    elif total < 60:
        category = "Developing"
    elif total < 75:
        category = "Solid"
    elif total < 88:
        category = "Athletic"
    else:
        category = "Elite"

    # Weakest
    subs = {"Body Composition": body_comp, "Frame & Structure": frame,
            "Functional Strength": strength, "Training Consistency": consistency,
            "AI Form Quality": form}
    weakest = min(subs, key=subs.get)
    tips = {
        "Body Composition": "Add 20 min of Zone 2 cardio 3x/week and hit 1g protein per lb.",
        "Frame & Structure": "Focus on lean-bulk protocol: +200 kcal, heavy compounds.",
        "Functional Strength": "Prioritize progressive overload on 5 compound lifts weekly.",
        "Training Consistency": "Anchor workouts to a fixed daily time to build streak.",
        "AI Form Quality": "Run Ghost Overlay drills for your weakest lift twice a week.",
    }

    # 8-week trend (synthetic based on hash of user id + variance)
    import hashlib
    seed = int(hashlib.md5(user["id"].encode()).hexdigest()[:8], 16)
    trend = []
    for i in range(8):
        v = max(20, min(100, total - 15 + i * 2 + ((seed >> i) % 6) - 3))
        trend.append(round(v, 1))

    return {
        "total": total, "category": category,
        "sub_scores": {k: round(v, 1) for k, v in subs.items()},
        "weakest": weakest, "tip": tips[weakest], "trend": trend,
    }

# ----- Analytics -----
@api.get("/analytics/heatmap")
async def heatmap(user=Depends(get_user)):
    ws = await db.workouts.find({"user_id": user["id"]}, {"_id": 0, "date": 1}).to_list(500)
    from collections import Counter
    counts = Counter(w["date"][:10] for w in ws if "date" in w)
    return counts

@api.get("/analytics/muscle-activation")
async def muscle_activation(user=Depends(get_user)):
    ws = await db.workouts.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    ex_map = {e["id"]: e["muscle_group"] for e in EXERCISES_SEED}
    activation = {"Chest": 0, "Back": 0, "Legs": 0, "Shoulders": 0, "Arms": 0, "Core": 0}
    for w in ws:
        for ex in w.get("exercises", []):
            eid = ex.get("id")
            mg = ex_map.get(eid)
            if mg and mg in activation:
                activation[mg] += ex.get("sets", 3)
    total = sum(activation.values()) or 1
    return {k: round(v / total * 100, 1) for k, v in activation.items()}

@api.get("/analytics/plateau")
async def plateau(user=Depends(get_user)):
    # synthetic 1RM projection
    import hashlib
    seed = int(hashlib.md5(user["id"].encode()).hexdigest()[:6], 16)
    hist = [140 + i * 2 + (seed % 5) for i in range(6)]
    proj = [hist[-1] + i * 1.2 for i in range(1, 5)]
    return {"historical": hist, "projected": proj, "lift": "Bench Press"}

# ----- Achievements -----
DEFAULT_BADGES = [
    {"id": "first_workout", "title": "First Steps", "desc": "Complete your first workout", "icon": "walk"},
    {"id": "streak_7", "title": "Cosmic Week", "desc": "7-day streak", "icon": "flame"},
    {"id": "streak_30", "title": "Stellar Month", "desc": "30-day streak", "icon": "star"},
    {"id": "form_90", "title": "Ghost Master", "desc": "90%+ form score", "icon": "shield-checkmark"},
    {"id": "pr_bench", "title": "Bench Titan", "desc": "New Bench Press PR", "icon": "trophy"},
    {"id": "score_75", "title": "Athletic Tier", "desc": "Reach Athletic fitness score", "icon": "rocket"},
    {"id": "meals_50", "title": "Fuel Alchemist", "desc": "Log 50 meals", "icon": "nutrition"},
    {"id": "recovery_pro", "title": "Zen Warrior", "desc": "10 recovery check-ins", "icon": "moon"},
]

@api.get("/achievements")
async def achievements(user=Depends(get_user)):
    w = await db.workouts.count_documents({"user_id": user["id"]})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    forms = await db.form_checks.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    meals_cnt = await db.nutrition.count_documents({"user_id": user["id"]})
    rec = await db.recovery.count_documents({"user_id": user["id"]})
    streak = u.get("streak", 0)
    avg_form = sum(f.get("avg_score", 0) for f in forms) / len(forms) if forms else 0
    unlocked = set()
    if w >= 1:
        unlocked.add("first_workout")
    if streak >= 7:
        unlocked.add("streak_7")
    if streak >= 30:
        unlocked.add("streak_30")
    if avg_form >= 90:
        unlocked.add("form_90")
    if any(f.get("exercise_id") == "bp" for f in forms):
        unlocked.add("pr_bench")
    if meals_cnt >= 50:
        unlocked.add("meals_50")
    if rec >= 10:
        unlocked.add("recovery_pro")
    return [{**b, "unlocked": b["id"] in unlocked} for b in DEFAULT_BADGES]

# ----- AI Coach -----
COACH_SYSTEM = """You are FormFit AI Coach — a premium, no-nonsense strength & conditioning coach.
You speak concisely with confidence, in 3-6 sentences max unless deeply technical.
You help with: form questions, program adjustments, fitness score interpretation, plateau breaks,
injury-risk patterns, mobility routines, and nutrition guidance.
Never push extreme body-composition ideals. Frame body-comp discussion around healthy ranges.
Use metric units by default. Include one concrete actionable step in each response."""

@api.post("/coach/chat")
async def coach_chat(body: ChatReq, user=Depends(get_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    # store user msg
    await db.coach_msgs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "session_id": body.session_id,
        "role": "user", "content": body.message, "ts": now_utc()
    })
    ctx = f"User: {user.get('name')}. Split: {user.get('current_split')}. Goal: {user.get('goal')}. Streak: {user.get('streak',0)}."
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=body.session_id,
        system_message=COACH_SYSTEM + "\n\nUser context: " + ctx,
    ).with_model("anthropic", "claude-sonnet-4-6")
    try:
        reply = await chat.send_message(UserMessage(text=body.message))
    except Exception:
        logging.exception("LLM error")
        reply = "Coach offline briefly. Meanwhile: rest 90s between heavy sets and hit 1.6g/kg protein today."
    await db.coach_msgs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "session_id": body.session_id,
        "role": "assistant", "content": str(reply), "ts": now_utc()
    })
    return {"reply": str(reply)}

@api.get("/coach/history/{session_id}")
async def coach_history(session_id: str, user=Depends(get_user)):
    msgs = await db.coach_msgs.find({"user_id": user["id"], "session_id": session_id}, {"_id": 0}).sort("ts", 1).to_list(200)
    return msgs

# ---------- Mount ----------
app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
