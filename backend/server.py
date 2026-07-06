from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
import base64
import json
import httpx
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
    split: str  # push_pull_legs, upper_lower, bro, four_day, full_body, custom
    days_per_week: Optional[int] = None

class GoogleSessionReq(BaseModel):
    session_id: str  # from emergent auth redirect

class FoodScanReq(BaseModel):
    image_base64: str

class FoodLogReq(BaseModel):
    name: str
    calories: int
    protein: float = 0
    carbs: float = 0
    fats: float = 0
    portion: Optional[str] = None

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
    # Compounds
    {"id": "sq", "name": "Barbell Back Squat", "muscle_group": "Legs", "equipment": "Barbell",
     "cues": ["Chest up", "Knees track over toes", "Depth: hip crease below knee"],
     "form_rules": {"exercise": "sq"}, "difficulty": "Advanced", "beginner_friendly": False},
    {"id": "sq_bw", "name": "Bodyweight Squat", "muscle_group": "Legs", "equipment": "Bodyweight",
     "cues": ["Feet shoulder width", "Sit hips back and down", "Knees track over toes"],
     "form_rules": {"exercise": "sq"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "dl", "name": "Conventional Deadlift", "muscle_group": "Back", "equipment": "Barbell",
     "cues": ["Neutral spine", "Bar over midfoot", "Drive floor away"],
     "form_rules": {"exercise": "dl"}, "difficulty": "Advanced", "beginner_friendly": False},
    {"id": "bp", "name": "Bench Press", "muscle_group": "Chest", "equipment": "Barbell",
     "cues": ["Scapula retracted", "Bar to lower chest", "Wrists stacked"],
     "form_rules": {"exercise": "bp"}, "difficulty": "Intermediate", "beginner_friendly": False},
    {"id": "pu", "name": "Pull-Up", "muscle_group": "Back", "equipment": "Bodyweight",
     "cues": ["Full hang start", "Chest to bar", "No kipping"],
     "form_rules": {"exercise": "pu"}, "difficulty": "Intermediate", "beginner_friendly": True},
    {"id": "cu_p", "name": "Chin-Up", "muscle_group": "Back", "equipment": "Bodyweight",
     "cues": ["Underhand grip", "Chin over bar", "Controlled negative"],
     "form_rules": {"exercise": "pu"}, "difficulty": "Intermediate", "beginner_friendly": True},
    {"id": "pu_assist", "name": "Assisted Pull-Up", "muscle_group": "Back", "equipment": "Machine",
     "cues": ["Same form as pull-up", "Use band or machine assist"],
     "form_rules": {"exercise": "pu"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "pushup", "name": "Push-Up", "muscle_group": "Chest", "equipment": "Bodyweight",
     "cues": ["Body straight — head to heels", "Chest to floor", "Elbows 45°"],
     "form_rules": {"exercise": "pushup"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "pu_wall", "name": "Wall Push-Up", "muscle_group": "Chest", "equipment": "Bodyweight",
     "cues": ["Feet ~1m from wall", "Body straight", "Full elbow extension"],
     "form_rules": {"exercise": "pushup"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "lg", "name": "Walking Lunge", "muscle_group": "Legs", "equipment": "Dumbbell",
     "cues": ["Vertical torso", "Front knee 90°", "Step long enough"],
     "form_rules": {"exercise": "lg"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "lg_bw", "name": "Bodyweight Lunge", "muscle_group": "Legs", "equipment": "Bodyweight",
     "cues": ["Step long", "Front knee tracks toe", "Back knee kisses floor"],
     "form_rules": {"exercise": "lg"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "op", "name": "Overhead Press", "muscle_group": "Shoulders", "equipment": "Barbell",
     "cues": ["Glutes tight", "Bar path vertical", "Lockout overhead"],
     "form_rules": {"exercise": "op"}, "difficulty": "Intermediate", "beginner_friendly": False},
    {"id": "pl", "name": "Plank", "muscle_group": "Core", "equipment": "Bodyweight",
     "cues": ["Neutral spine", "Glutes engaged", "Shoulders over elbows"],
     "form_rules": {"exercise": "pl"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "rd", "name": "Romanian Deadlift", "muscle_group": "Legs", "equipment": "Barbell",
     "cues": ["Push hips back", "Slight knee bend", "Bar close to legs"],
     "form_rules": {"exercise": "dl"}, "difficulty": "Intermediate", "beginner_friendly": False},
    {"id": "rw", "name": "Barbell Row", "muscle_group": "Back", "equipment": "Barbell",
     "cues": ["Flat back", "Pull to lower ribs", "Elbows tight"],
     "form_rules": {"exercise": "bp"}, "difficulty": "Intermediate", "beginner_friendly": False},
    {"id": "cu", "name": "Dumbbell Curl", "muscle_group": "Arms", "equipment": "Dumbbell",
     "cues": ["Elbows pinned", "Full contraction", "Slow eccentric"],
     "form_rules": {"exercise": "bp"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "tr", "name": "Triceps Pushdown", "muscle_group": "Arms", "equipment": "Cable",
     "cues": ["Elbows fixed", "Full lockout", "Neutral wrist"],
     "form_rules": {"exercise": "bp"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "hp", "name": "Hip Thrust", "muscle_group": "Legs", "equipment": "Barbell",
     "cues": ["Chin tucked", "Glute squeeze at top", "Ribs down"],
     "form_rules": {"exercise": "sq"}, "difficulty": "Intermediate", "beginner_friendly": False},
    {"id": "gb", "name": "Glute Bridge", "muscle_group": "Legs", "equipment": "Bodyweight",
     "cues": ["Feet flat", "Squeeze glutes at top", "Ribs down"],
     "form_rules": {"exercise": "sq"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "sit", "name": "Sit-Up", "muscle_group": "Core", "equipment": "Bodyweight",
     "cues": ["Feet anchored", "Chin off chest", "Controlled descent"],
     "form_rules": {"exercise": "pl"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "mc", "name": "Mountain Climber", "muscle_group": "Core", "equipment": "Bodyweight",
     "cues": ["Plank position", "Drive knees fast", "Hips level"],
     "form_rules": {"exercise": "pl"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "burp", "name": "Burpee", "muscle_group": "Core", "equipment": "Bodyweight",
     "cues": ["Squat down", "Kick back to plank", "Jump up explosively"],
     "form_rules": {"exercise": "sq"}, "difficulty": "Intermediate", "beginner_friendly": False},
    {"id": "step", "name": "Step-Up", "muscle_group": "Legs", "equipment": "Bodyweight",
     "cues": ["Drive through heel", "Full extension at top", "Control descent"],
     "form_rules": {"exercise": "lg"}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "leg_press", "name": "Leg Press", "muscle_group": "Legs", "equipment": "Machine",
     "cues": ["Feet shoulder width", "Don't lock knees", "Full range"],
     "form_rules": {}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "lat_pd", "name": "Lat Pulldown", "muscle_group": "Back", "equipment": "Machine",
     "cues": ["Chest up", "Pull to upper chest", "Squeeze lats"],
     "form_rules": {}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "seated_row", "name": "Seated Cable Row", "muscle_group": "Back", "equipment": "Machine",
     "cues": ["Chest up", "Pull to lower ribs", "Squeeze scaps"],
     "form_rules": {}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "leg_curl", "name": "Leg Curl", "muscle_group": "Legs", "equipment": "Machine",
     "cues": ["Full range", "Slow eccentric", "Squeeze hamstrings"],
     "form_rules": {}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "leg_ext", "name": "Leg Extension", "muscle_group": "Legs", "equipment": "Machine",
     "cues": ["Full extension", "Slow eccentric", "Toes up"],
     "form_rules": {}, "difficulty": "Beginner", "beginner_friendly": True},
    {"id": "calf", "name": "Calf Raise", "muscle_group": "Legs", "equipment": "Machine",
     "cues": ["Full stretch", "Peak contraction", "Slow tempo"],
     "form_rules": {}, "difficulty": "Beginner", "beginner_friendly": True},
]

@api.get("/exercises")
async def list_exercises(muscle: Optional[str] = None, q: Optional[str] = None, beginner: Optional[bool] = None):
    items = EXERCISES_SEED
    if muscle and muscle.lower() != "all":
        items = [e for e in items if e["muscle_group"].lower() == muscle.lower()]
    if q:
        ql = q.lower()
        items = [e for e in items if ql in e["name"].lower()]
    if beginner:
        items = [e for e in items if e.get("beginner_friendly")]
    return items

@api.get("/exercises/{exercise_id}")
async def get_exercise(exercise_id: str):
    ex = next((e for e in EXERCISES_SEED if e["id"] == exercise_id), None)
    if not ex:
        raise HTTPException(404, "Not found")
    return ex

# ----- Splits -----
# Real templates keyed by (split_name, days_per_week) → list of day dicts
SPLIT_TEMPLATES = {
    ("push_pull_legs", 6): [
        {"day": "Mon", "label": "Push", "exercises": ["bp", "op", "pushup", "tr"]},
        {"day": "Tue", "label": "Pull", "exercises": ["pu", "rw", "lat_pd", "cu"]},
        {"day": "Wed", "label": "Legs", "exercises": ["sq", "dl", "lg", "leg_press", "calf"]},
        {"day": "Thu", "label": "Push", "exercises": ["bp", "op", "pushup", "tr"]},
        {"day": "Fri", "label": "Pull", "exercises": ["pu", "rw", "lat_pd", "cu"]},
        {"day": "Sat", "label": "Legs", "exercises": ["sq", "hp", "lg", "leg_curl", "calf"]},
        {"day": "Sun", "label": "Rest", "exercises": []},
    ],
    ("push_pull_legs", 3): [
        {"day": "Mon", "label": "Push", "exercises": ["bp", "op", "pushup", "tr"]},
        {"day": "Tue", "label": "Rest", "exercises": []},
        {"day": "Wed", "label": "Pull", "exercises": ["pu", "rw", "lat_pd", "cu"]},
        {"day": "Thu", "label": "Rest", "exercises": []},
        {"day": "Fri", "label": "Legs", "exercises": ["sq", "dl", "lg", "leg_press", "calf"]},
        {"day": "Sat", "label": "Rest", "exercises": []},
        {"day": "Sun", "label": "Rest", "exercises": []},
    ],
    ("upper_lower", 4): [
        {"day": "Mon", "label": "Upper A", "exercises": ["bp", "rw", "op", "cu"]},
        {"day": "Tue", "label": "Lower A", "exercises": ["sq", "leg_curl", "calf", "gb"]},
        {"day": "Wed", "label": "Rest", "exercises": []},
        {"day": "Thu", "label": "Upper B", "exercises": ["pu", "pushup", "lat_pd", "tr"]},
        {"day": "Fri", "label": "Lower B", "exercises": ["dl", "lg", "leg_ext", "hp"]},
        {"day": "Sat", "label": "Rest", "exercises": []},
        {"day": "Sun", "label": "Rest", "exercises": []},
    ],
    ("bro", 5): [
        {"day": "Mon", "label": "Chest", "exercises": ["bp", "pushup", "tr"]},
        {"day": "Tue", "label": "Back", "exercises": ["pu", "rw", "lat_pd", "seated_row"]},
        {"day": "Wed", "label": "Legs", "exercises": ["sq", "dl", "leg_press", "leg_curl", "calf"]},
        {"day": "Thu", "label": "Shoulders", "exercises": ["op", "pushup"]},
        {"day": "Fri", "label": "Arms", "exercises": ["cu", "tr", "cu_p"]},
        {"day": "Sat", "label": "Rest", "exercises": []},
        {"day": "Sun", "label": "Rest", "exercises": []},
    ],
    ("four_day", 4): [
        {"day": "Mon", "label": "Chest + Triceps", "exercises": ["bp", "pushup", "tr"]},
        {"day": "Tue", "label": "Back + Biceps", "exercises": ["pu", "rw", "cu"]},
        {"day": "Wed", "label": "Rest", "exercises": []},
        {"day": "Thu", "label": "Legs", "exercises": ["sq", "dl", "lg", "calf"]},
        {"day": "Fri", "label": "Shoulders + Core", "exercises": ["op", "pl", "sit"]},
        {"day": "Sat", "label": "Rest", "exercises": []},
        {"day": "Sun", "label": "Rest", "exercises": []},
    ],
    ("full_body", 3): [
        {"day": "Mon", "label": "Full Body", "exercises": ["sq", "bp", "rw"]},
        {"day": "Tue", "label": "Rest", "exercises": []},
        {"day": "Wed", "label": "Full Body", "exercises": ["dl", "op", "pu"]},
        {"day": "Thu", "label": "Rest", "exercises": []},
        {"day": "Fri", "label": "Full Body", "exercises": ["sq", "bp", "rw"]},
        {"day": "Sat", "label": "Rest", "exercises": []},
        {"day": "Sun", "label": "Rest", "exercises": []},
    ],
}

SPLIT_DEFAULT_DAYS = {"push_pull_legs": 6, "upper_lower": 4, "bro": 5, "four_day": 4, "full_body": 3}

def _split_template(split: str, days: Optional[int] = None):
    if split not in SPLIT_DEFAULT_DAYS:
        return None
    d = days or SPLIT_DEFAULT_DAYS[split]
    if (split, d) in SPLIT_TEMPLATES:
        return SPLIT_TEMPLATES[(split, d)]
    return SPLIT_TEMPLATES.get((split, SPLIT_DEFAULT_DAYS[split]))

@api.get("/splits/{split}")
async def get_split(split: str, days: Optional[int] = None):
    tpl = _split_template(split, days)
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
    if body.split not in SPLIT_DEFAULT_DAYS and body.split != "custom":
        raise HTTPException(400, "Invalid split")
    days = getattr(body, "days_per_week", None)
    upd = {"current_split": body.split}
    if days:
        upd["days_per_week"] = days
    await db.users.update_one({"id": user["id"]}, {"$set": upd})
    # Clear cached schedule (Weekly Calendar always pulls from /splits/:s)
    await db.user_schedule.delete_many({"user_id": user["id"]})
    return {"ok": True, "current_split": body.split, "days_per_week": days}

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
def _body_comp_score(bf_pct: Optional[float], sex: str, age: Optional[int]) -> tuple[float, bool]:
    """Score body composition from body-fat % against sex/age-adjusted athletic ranges.
    Returns (score, sufficient_data). Never penalises based on BMI."""
    if bf_pct is None:
        return 70.0, False  # neutral default
    s = (sex or "male").lower()
    # Athletic bands (score = 100 in range, taper outside)
    if s == "male":
        athletic = (10, 15)   # lean athletic
        healthy  = (8, 20)    # broader healthy
        essential = 5
    else:
        athletic = (18, 24)
        healthy  = (16, 28)
        essential = 12
    # Age adjustment: shift bands +0.5% per decade over 30
    if age and age > 30:
        shift = min(4.0, (age - 30) / 10.0 * 1.5)
        athletic = (athletic[0] + shift, athletic[1] + shift)
        healthy  = (healthy[0] + shift, healthy[1] + shift)

    if athletic[0] <= bf_pct <= athletic[1]:
        return 100.0, True
    # Within broader healthy band → 80-95
    if healthy[0] <= bf_pct <= healthy[1]:
        # distance from athletic band
        d = min(abs(bf_pct - athletic[0]), abs(bf_pct - athletic[1]))
        return round(max(80.0, 100.0 - d * 3.5), 1), True
    # Below essential — penalise heavily (unhealthy)
    if bf_pct < essential:
        return round(max(30.0, 60.0 - (essential - bf_pct) * 4), 1), True
    # Below healthy band but above essential — taper down from healthy floor
    if bf_pct < healthy[0]:
        under = healthy[0] - bf_pct
        return round(max(50.0, 78.0 - under * 4), 1), True
    # Above healthy — taper down but never zero
    over = bf_pct - healthy[1]
    return round(max(30.0, 78.0 - over * 2.5), 1), True

def _frame_score(height_cm: Optional[float], weight_kg: Optional[float], bf_pct: Optional[float]) -> tuple[float, bool]:
    """Frame & structure — proportional healthy-weight range, NOT raw BMI.
    Uses body-fat-adjusted lean mass to reward muscular builds."""
    if not height_cm or not weight_kg:
        return 70.0, False
    h_m = height_cm / 100.0
    # Healthy weight range for height (BMI 19-25 as a range, not a point)
    healthy_min = 19 * h_m * h_m
    healthy_max = 25 * h_m * h_m
    # If we know BF, adjust upper bound up for muscular builds
    if bf_pct is not None and bf_pct < 18:
        healthy_max += 6  # muscular allowance
    if healthy_min <= weight_kg <= healthy_max:
        return 95.0, True
    # Outside — taper
    if weight_kg < healthy_min:
        d = healthy_min - weight_kg
        return round(max(60.0, 95.0 - d * 2), 1), True
    d = weight_kg - healthy_max
    return round(max(45.0, 95.0 - d * 1.8), 1), True

def _strength_score(workouts_count: int) -> tuple[float, bool]:
    if workouts_count <= 0:
        return 70.0, False  # neutral until enough data
    if workouts_count < 5:
        return 72.0, False  # still not enough
    return min(100.0, 60 + workouts_count * 3), True

def _consistency_score(streak: int, workouts_count: int) -> tuple[float, bool]:
    if workouts_count < 3:
        return 70.0, False
    return min(100.0, 55 + streak * 4 + workouts_count), True

def _form_score(forms: list) -> tuple[float, bool]:
    if not forms:
        return 70.0, False
    avg = sum(f.get("avg_score", 0) for f in forms) / len(forms)
    return round(avg, 1), True

@api.get("/fitness-score")
async def fitness_score(user=Depends(get_user)):
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    workouts = await db.workouts.count_documents({"user_id": user["id"]})
    forms = await db.form_checks.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)

    bc, bc_ok = _body_comp_score(u.get("body_fat_percent"), u.get("sex") or "male", u.get("age"))
    fr, fr_ok = _frame_score(u.get("height_cm"), u.get("weight_kg"), u.get("body_fat_percent"))
    st, st_ok = _strength_score(workouts)
    co, co_ok = _consistency_score(u.get("streak", 0), workouts)
    fq, fq_ok = _form_score(forms)

    total = round(bc * 0.35 + fr * 0.15 + st * 0.20 + co * 0.15 + fq * 0.15, 1)

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

    subs = {"Body Composition": bc, "Frame & Structure": fr,
            "Functional Strength": st, "Training Consistency": co,
            "AI Form Quality": fq}
    ok_map = {"Body Composition": bc_ok, "Frame & Structure": fr_ok,
              "Functional Strength": st_ok, "Training Consistency": co_ok,
              "AI Form Quality": fq_ok}
    # Weakest — but only among sub-scores with real data
    real_subs = {k: v for k, v in subs.items() if ok_map[k]}
    weakest = min(real_subs, key=real_subs.get) if real_subs else min(subs, key=subs.get)
    tips = {
        "Body Composition": "Add 20 min of Zone 2 cardio 3x/week and hit 1g protein per lb.",
        "Frame & Structure": "Fill out your body metrics in Profile for a more precise score.",
        "Functional Strength": "Prioritize progressive overload on 5 compound lifts weekly.",
        "Training Consistency": "Anchor workouts to a fixed daily time to build streak.",
        "AI Form Quality": "Run Ghost Overlay drills for your weakest lift twice a week.",
    }

    # 8-week trend synthetic based on current score
    import hashlib
    seed = int(hashlib.md5(user["id"].encode()).hexdigest()[:8], 16)
    trend = []
    for i in range(8):
        v = max(20, min(100, total - 15 + i * 2 + ((seed >> i) % 6) - 3))
        trend.append(round(v, 1))

    return {
        "total": total, "category": category,
        "sub_scores": {k: round(v, 1) for k, v in subs.items()},
        "sub_scores_sufficient_data": ok_map,
        "weakest": weakest, "tip": tips[weakest], "trend": trend,
        "formula_notes": {
            "body_composition": "Body fat % vs sex/age-adjusted athletic + healthy bands (NOT BMI).",
            "frame_structure": "Weight vs healthy range for height (BMI 19-25 broad range with lean-muscular allowance).",
            "functional_strength": "Workout count logged (60 + 3/workout, capped at 100).",
            "training_consistency": "Streak-driven (55 + 4·streak + workouts, capped at 100).",
            "ai_form_quality": "Average avg_score across all form-check sessions.",
            "weights": {"body_composition": 0.35, "frame_structure": 0.15,
                        "functional_strength": 0.20, "training_consistency": 0.15,
                        "ai_form_quality": 0.15},
        },
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
COACH_SYSTEM = """You are FormFit AI Coach — a premium strength & conditioning coach.

STYLE:
- Concise. 3-6 sentences max unless deeply technical.
- Use markdown: **bold** the key point, use `- bullets` for lists (3-5 bullets max), use `#` sparingly.
- Every reply MUST include one concrete, actionable next step.
- Use metric units. Never push extreme body-composition ideals.

TOPICS you handle: form correction, program adjustment, fitness-score interpretation, plateaus,
injury-risk patterns (e.g. recurring knee valgus), mobility, and nutrition.

If the user's context is thin, ask ONE clarifying question before giving generic advice.
Never invent data about the user — only reference what's given in the context block."""

async def _coach_context(user: dict) -> str:
    uid = user["id"]
    workouts = await db.workouts.count_documents({"user_id": uid})
    forms = await db.form_checks.find({"user_id": uid}, {"_id": 0}).sort("timestamp", -1).to_list(5)
    avg_form = round(sum(f.get("avg_score", 0) for f in forms) / len(forms), 1) if forms else None
    last_ex = forms[0].get("exercise_id") if forms else None
    return (
        f"User: {user.get('name')}. Split: {user.get('current_split')}. Goal: {user.get('goal')}. "
        f"Streak: {user.get('streak', 0)}. Total workouts: {workouts}. "
        f"Height: {user.get('height_cm')}cm. Weight: {user.get('weight_kg')}kg. "
        f"Body-fat: {user.get('body_fat_percent')}%. Age: {user.get('age')}. Sex: {user.get('sex')}. "
        f"Recent avg form score: {avg_form}. Last exercise checked: {last_ex}."
    )

@api.post("/coach/chat")
async def coach_chat(body: ChatReq, user=Depends(get_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    await db.coach_msgs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "session_id": body.session_id,
        "role": "user", "content": body.message, "ts": now_utc()
    })
    ctx = await _coach_context(user)
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=body.session_id,
        system_message=COACH_SYSTEM + "\n\nUSER CONTEXT:\n" + ctx,
    ).with_model("anthropic", "claude-sonnet-4-6")
    try:
        reply = await chat.send_message(UserMessage(text=body.message))
    except Exception:
        logging.exception("LLM error")
        reply = ("**Coach offline briefly.** Meanwhile:\n\n"
                 "- Rest 90s between heavy sets\n"
                 "- Hit **1.6g/kg** protein today\n"
                 "- Log at least one form-check to sharpen your score")
    await db.coach_msgs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "session_id": body.session_id,
        "role": "assistant", "content": str(reply), "ts": now_utc()
    })
    return {"reply": str(reply)}

@api.get("/coach/history/{session_id}")
async def coach_history(session_id: str, user=Depends(get_user)):
    msgs = await db.coach_msgs.find({"user_id": user["id"], "session_id": session_id}, {"_id": 0}).sort("ts", 1).to_list(200)
    return msgs

# ----- Google OAuth (Emergent-managed) -----
@api.post("/auth/google-session")
async def google_session(body: GoogleSessionReq):
    """Exchange emergent session_id for our JWT token + user."""
    async with httpx.AsyncClient(timeout=15) as h:
        r = await h.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(401, "Invalid emergent session")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(400, "No email in session")
    existing = await db.users.find_one({"email": email})
    if existing:
        uid = existing["id"]
        await db.users.update_one({"id": uid}, {"$set": {"picture": data.get("picture")}})
    else:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "name": data.get("name") or email.split("@")[0],
            "email": email, "password_hash": "",
            "picture": data.get("picture"),
            "height_cm": None, "weight_kg": None, "body_fat_percent": None,
            "age": None, "sex": None, "current_split": "push_pull_legs",
            "goal": "maintain", "streak": 0, "created_at": now_utc(),
        })
    u = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    return {"token": make_token(uid), "user": u}

# ----- Food Photo Scanner (Vision LLM) -----
FOOD_PROMPT = """You are a nutrition assistant. Identify the food(s) in this image and estimate the total for the visible portion.
Respond ONLY with valid JSON, no other text, matching:
{
  "name": "concise food name (e.g. 'Grilled chicken, rice, broccoli')",
  "portion": "portion description (e.g. '1 plate, ~350g')",
  "calories": integer,
  "protein": grams as number,
  "carbs": grams as number,
  "fats": grams as number,
  "confidence": "low" | "medium" | "high"
}"""

@api.post("/nutrition/scan")
async def scan_food(body: FoodScanReq, user=Depends(get_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    # strip data-url prefix if present
    b64 = body.image_base64
    if "," in b64 and b64.startswith("data:"):
        b64 = b64.split(",", 1)[1]
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"food_{user['id']}_{uuid.uuid4().hex[:6]}",
        system_message=FOOD_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-6")
    try:
        msg = UserMessage(text="Analyze this food photo.", file_contents=[ImageContent(image_base64=b64)])
        reply = await chat.send_message(msg)
        text = str(reply).strip()
        # try to extract JSON
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            text = text[start:end + 1]
        data = json.loads(text)
        return {"ok": True, **data}
    except Exception as e:
        logging.exception("Food scan error")
        return {
            "ok": False, "error": str(e)[:120],
            "name": "Mixed meal", "portion": "1 serving",
            "calories": 500, "protein": 30, "carbs": 55, "fats": 18,
            "confidence": "low",
        }

@api.post("/nutrition/log-food")
async def log_food(body: FoodLogReq, user=Depends(get_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    meal = {
        "name": body.name, "calories": body.calories,
        "protein": body.protein, "carbs": body.carbs, "fats": body.fats,
        "time": datetime.now(timezone.utc).strftime("%H:%M"),
        "portion": body.portion,
    }
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "date": today,
           "meals": [meal], "water_ml": 0}
    await db.nutrition.insert_one(doc)
    return {"ok": True, "meal": meal}

# ----- Pose HTML (MediaPipe wrapper served for WebView / iframe) -----
POSE_HTML_PATH = ROOT_DIR.parent / "frontend" / "assets" / "pose.html"

from fastapi.responses import HTMLResponse

@api.get("/pose-view", response_class=HTMLResponse)
async def pose_view():
    try:
        with open(POSE_HTML_PATH, "r") as f:
            return HTMLResponse(f.read())
    except Exception:
        return HTMLResponse("<html><body>Pose engine unavailable</body></html>", status_code=500)

# ---------- Mount ----------
app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
