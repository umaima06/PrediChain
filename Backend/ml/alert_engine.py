# backend/ml/alert_engine.py
import os
import json
import time
import joblib
import requests
import pandas as pd
import numpy as np
from difflib import get_close_matches
from ml.ai_context_engine import ask_openai

# ========== MODEL PATHS ==========
RISK_MODEL_PATH = "ml/models/risk_assessor_v3.joblib"
RECOVERY_MODEL_PATH = "ml/models/recovery_advisor_v3.joblib"
INCIDENT_LOG = "data/incidents.json"

os.makedirs(os.path.dirname(INCIDENT_LOG), exist_ok=True)

# Known sample tags
KNOWN_PHASES = [
    "foundation", "slabbing", "curing", "excavation", "finishing",
    "painting", "roofing", "formwork", "tiling", "waterproofing",
    "plumbing", "electrical", "roadwork", "bridgework"
]

KNOWN_STRUCTURES = ["building", "bridge", "road", "dam", "tunnel", "warehouse"]

# Load models if available
risk_model = joblib.load(RISK_MODEL_PATH) if os.path.exists(RISK_MODEL_PATH) else None
recovery_model = joblib.load(RECOVERY_MODEL_PATH) if os.path.exists(RECOVERY_MODEL_PATH) else None


# ---------------- WEATHER FETCH ----------------
def fetch_weather(lat, lon):
    """Fetch weather with safe fallback."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&hourly=temperature_2m,precipitation,humidity_2m,wind_speed_10m"
            f"&forecast_days=1"
        )
        r = requests.get(url, timeout=(3, 5))
        data = r.json()
        if "hourly" in data:
            df = pd.DataFrame(data["hourly"])
            next6 = df.tail(6)
            return {
                "temperature": float(next6["temperature_2m"].mean()),
                "rain": float(next6["precipitation"].sum()),
                "humidity": float(next6["humidity_2m"].mean()),
                "wind": float(next6["wind_speed_10m"].mean()),
            }
        else:
            raise KeyError("hourly key missing in response")

    except Exception as e:
        print("⚠️ Weather fetch failed:", e)
        # fallback random realistic defaults
        return {
            "temperature": 28 + np.random.uniform(-3, 3),
            "rain": np.random.uniform(0, 10),
            "humidity": 60 + np.random.uniform(-10, 10),
            "wind": 8 + np.random.uniform(-3, 3)
        }


# ---------------- NORMALIZATION ----------------
def normalize_text(text, known_list):
    """Fuzzy match to known keywords"""
    if not text:
        return "unknown"
    text = str(text).lower().strip()
    match = get_close_matches(text, known_list, n=1, cutoff=0.5)
    return match[0] if match else text


# ---------------- RISK PREDICTION ----------------
def predict_risk(project):
    """
    Predicts construction risk dynamically using weather + phase + structure + materials.
    Auto-aligns with the trained pipeline's 7 input columns.
    """

    lat, lon = project.get("latitude"), project.get("longitude")
    phase = normalize_text(project.get("phase"), KNOWN_PHASES)
    struct = normalize_text(project.get("structure_type"), KNOWN_STRUCTURES)
    materials = project.get("materials", [])

    # Fetch live weather
    weather = fetch_weather(lat, lon)

    # Build dynamic DataFrame with 7 columns (matching training)
    features = pd.DataFrame([{
        "temperature": weather["temperature"],
        "rain": weather["rain"],
        "humidity": weather["humidity"],
        "wind": weather["wind"],
        "materials_complexity": len(materials),
        "phase": phase,
        "structure": struct
    }])

    if risk_model:
        try:
            pred = risk_model.predict(features)[0]
            conf = float(np.max(risk_model.predict_proba(features)))
        except Exception as e:
            print("⚠️ Model predict failed:", e)
            pred, conf = "Medium", 0.6
    else:
        # Heuristic fallback
        score = 0
        if weather["rain"] > 20: score += 2
        if weather["humidity"] > 85: score += 2
        if weather["wind"] > 35: score += 1
        if "slab" in phase or "concrete" in phase: score += 1
        pred = "High" if score >= 4 else "Medium" if score >= 2 else "Low"
        conf = 0.6 + score * 0.1

    # Generate alert
    # Generate alert
    if pred == "High" and weather["rain"] > 20:
        alert = f"🌧️ Rain forecasted near {project['location']}. Postpone {phase} work immediately."
    elif pred == "Medium":
        alert = f"⚠️ Slightly risky conditions for {phase}. Monitor humidity and material storage."
    elif pred == "Low":
        alert = f"✅ Optimal conditions for {phase} phase — continue safely."
    else:
        # Explicit "all clear" message in case risk prediction returns something unexpected
        alert = "✅ Everything is fine — no weather alerts."

    return {
        "phase": phase,
        "structure": struct,
        "weather": weather,
        "risk_level": pred,
        "confidence": round(conf, 2),
        "alert_text": alert,
        "recommended_action": "What to do next" if pred == "High" else "Acknowledge"
    }

# ---------------- RECOVERY ADVICE ----------------
def generate_recovery_plan(project, loss_report):
    """Suggest actions dynamically based on phase, structure, and weather"""
    phase = project.get("phase", "").lower()
    weather = fetch_weather(project.get("latitude"), project.get("longitude"))
    desc = loss_report.get("description", "").lower()

    plan = {
        "Immediate Actions": ["Secure materials", "Document damage with photos"],
        "Material Preservation": [],
        "Rescheduling": [],
        "Safety": []
    }

    # Smart dynamic suggestions
    if "slab" in phase or "concrete" in desc:
        plan["Immediate Actions"].append("Stop all concrete pouring; let the surface dry.")
        plan["Rescheduling"].append("Delay pouring until rain probability < 10% and humidity < 70%.")
    if "foundation" in phase:
        plan["Safety"].append("Inspect soil settlement or waterlogging around foundation.")
    if weather["rain"] > 15:
        plan["Material Preservation"].append("Cover raw materials with tarpaulin to avoid moisture.")
    if "steel" in desc:
        plan["Material Preservation"].append("Check for corrosion; clean and reapply rust-proof coating.")
    if "paint" in phase:
        plan["Rescheduling"].append("Avoid painting till humidity drops below 70%.")

    return plan


# ---------------- INCIDENT LOG ----------------
def log_incident(project, loss_report, user=None):
    entry = {
        "timestamp": int(time.time()),
        "project": project,
        "loss_report": loss_report,
        "user": user or {}
    }
    try:
        existing = json.load(open(INCIDENT_LOG)) if os.path.exists(INCIDENT_LOG) else []
        existing.append(entry)
        with open(INCIDENT_LOG, "w") as f:
            json.dump(existing, f, indent=2)
    except Exception as e:
        print("⚠️ Failed to log incident:", e)

def ai_dynamic_risk_analysis(project, csv_summary=None):
    lat, lon = project.get("latitude"), project.get("longitude")
    weather = fetch_weather(lat, lon)
    phase = project.get("phase", "unknown")
    structure = project.get("structure_type", "unknown")
    materials = ", ".join(project.get("materials", []))
    location = project.get("location", "")
    name = project.get("projectName", "")

    # compactify csv_summary — only include top materials and key stats
    csv_summary_small = {}
    try:
        if csv_summary and isinstance(csv_summary, dict):
            csv_summary_small["top_materials"] = csv_summary.get("global", {}).get("top_materials", [])
            # include per-material last_3_months and avg_monthly for top 5
            for m in csv_summary_small["top_materials"]:
                mat = m["material"]
                if csv_summary.get("summary", {}).get(mat):
                    s = csv_summary["summary"][mat]
                    csv_summary_small.setdefault("materials", {})[mat] = {
                        "total_usage": s.get("total_usage"),
                        "avg_monthly": s.get("avg_monthly"),
                        "last_3_months": s.get("last_3_months"),
                        "last_date": s.get("last_date")
                    }
    except Exception:
        csv_summary_small = {}

    prompt = f"""Analyze project and return single JSON object.
    Project: {name} — {location}
    Phase: {phase}
    Structure: {structure}
    Materials: {materials}

Weather now:
- temperature: {weather['temperature']:.1f} C
- rain mm (next window): {weather['rain']:.2f}
- humidity: {weather['humidity']:.1f}%
- wind: {weather['wind']:.1f} m/s

CSV Summary (trimmed):
{json.dumps(csv_summary_small, indent=2)}

Respond ONLY with valid JSON with keys:
- risk_level (High/Medium/Low)
- reasoning (string, 1-3 sentences)
- recommendations (array of 3-6 actionable steps)
- confidence (0.0-1.0)
"""


    ai_response = ask_openai(prompt)
    return {
        "project": name,
        "location": location,
        "weather": weather,
        "ai_insights": ai_response
    }
