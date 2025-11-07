# backend/app.py
"""
PrediChain backend main FastAPI app.

Endpoints provided:
- GET /health
- POST /upload-data                (upload historical CSV)
- POST /forecast                   (run forecast for material from historical CSV)
- POST /recommendation             (generate procurement recs using current project inputs)
- POST /historical_forecast        (return historical monthly agg + forecast)
- POST /dashboard-data             (combined payload for frontend dashboard)
- GET  /projects                   (protected: list projects.json)
- POST /projects                   (add project metadata)
- DELETE /projects/{proj_id}
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import json
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

# local ML modules (keep your existing functions)
from ml.forecast import generate_forecast
from ml.recommendation import generate_procurement_recommendations
# from ml.alert_engine import predict_risk, predict_recovery_action
from ml.alert_engine import predict_risk, generate_recovery_plan, log_incident, ai_dynamic_risk_analysis
from fastapi import Body
# Firebase admin token verification helper (must exist in backend/firebase_admin_auth.py)
from firebase_admin_auth import verify_firebase_token
import logging 
logging.basicConfig(level=logging.INFO)
# --- App init ---
app = FastAPI(title="PrediChain Backend", version="1.0")

# --- Directories & files ---
UPLOAD_DIR = "data/uploads"
FORECAST_DIR = "data/forecasts"
PROJECTS_FILE = "data/projects.json"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FORECAST_DIR, exist_ok=True)

if not os.path.exists(PROJECTS_FILE):
    with open(PROJECTS_FILE, "w") as f:
        json.dump([], f)

# --- CORS (adjust origins to match frontend) ---
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth dependency using Firebase ID token in Authorization: Bearer <idToken> header ---
def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Expect header: Authorization: Bearer <idToken>
    Returns decoded token dict or raises 401.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    parts = authorization.split()
    if parts[0].lower() != "bearer" or len(parts) != 2:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    id_token = parts[1]
    decoded = verify_firebase_token(id_token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return decoded

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"➡️ {request.method} {request.url}")
    response = await call_next(request)
    print(f"⬅️ {response.status_code}")
    return response
# --- Health ---
@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- Projects (simple JSON store) ---
@app.get("/projects")
def get_projects(user: dict = Depends(get_current_user)):
    """
    Returns all projects stored in PROJECTS_FILE.
    Protected with Firebase token (use get_current_user).
    """
    with open(PROJECTS_FILE, "r") as f:
        projects = json.load(f)
    return projects

@app.post("/projects")
def add_project(
    name: str = Form(...),
    location: str = Form(""),
    type: str = Form(...),
    startDate: str = Form(""),
    endDate: str = Form(""),
    owner: str = Form("me")
):
    new_project = {
        "id": int(pd.Timestamp.now().timestamp()),
        "owner": owner,
        "name": name,
        "location": location,
        "type": type,
        "startDate": startDate,
        "endDate": endDate,
        "status": "Active"
    }
    with open(PROJECTS_FILE, "r") as f:
        projects = json.load(f)
    projects.append(new_project)
    with open(PROJECTS_FILE, "w") as f:
        json.dump(projects, f, indent=4)
    return new_project

@app.delete("/projects/{proj_id}")
def delete_project(proj_id: int):
    with open(PROJECTS_FILE, "r") as f:
        projects = json.load(f)
    project = next((p for p in projects if p["id"] == proj_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    projects = [p for p in projects if p["id"] != proj_id]
    with open(PROJECTS_FILE, "w") as f:
        json.dump(projects, f, indent=4)
    return {"message": "Project deleted successfully"}

# --- Upload Historical CSV ---
@app.post("/upload-data")
async def upload_data(file: UploadFile = File(...)):
    """
    Upload historical CSV with the template you defined.
    Validates required columns present in CSV before saving.
    Returns filename to the frontend.
    """
    UPLOAD_DIR = "data/uploads"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(UPLOAD_DIR, file.filename)
    contents = await file.read()
    df = pd.read_csv(pd.io.common.BytesIO(contents), encoding='latin-1', sep=',', engine='python')
    df.columns = [c.strip() for c in df.columns]
    
    # required_cols = [
    #     "Project_ID", "Project_Name", "Project_Type", "Project_Size", "Location",
    #     "Start_Date", "End_Date", "Budget_Planned_Quantity", "Material_Name",
    #     "Quantity_Used", "Planned_Quantity", "Unit", "Supplier_Name",
    #     "Supllier_Reliability_Score", "Average_Delivery_Time_Days", "Delivery_Delays",
    #     "Contractor_Team_Size", "Number_of_Shifts_Work_Hours", "Weather_Condition",
    #     "Regional_Risk_Level", "Notes_Special_Conditions", "Project_Phase",
    #     "Date_of_Materail_Usage"
    # ]

    required_cols = [
        'Date_of_Materail_Usage', 
        'Material_Name', 
        'Quantity_Used'
      ]
      
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"CSV missing columns: {missing_cols}")

    filepath = os.path.join(UPLOAD_DIR, file.filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    return {"filename": file.filename, "message": "Upload successful"}

# --- Forecast (historical CSV -> Prophet monthly forecast) ---
@app.post("/forecast")
def forecast(
    filename: str = Form(...),
    material: str = Form(...),
    horizon_months: int = Form(6)
):
    """
    Run forecast for 'material' using historical CSV file 'filename'.
    Returns monthly forecast rows (forecast_date, yhat, yhat_lower, yhat_upper, material).
    """
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    df = pd.read_csv(filepath)
    df.columns = [c.strip() for c in df.columns]

    try:
        forecast_df = generate_forecast(df, material, horizon_months)
        return forecast_df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Recommendation (current project inputs + forecast) ---
@app.post("/recommendation")
def recommend_procurement(
    filename: str = Form(...),
    materials: str = Form("[]"),  # JSON string list
    horizon_months: int = Form(6),
    lead_time_days: int = Form(10),
    current_inventory: float = Form(0.0),
    supplierReliability: float = Form(100.0),
    deliveryTimeDays: float = Form(0.0),
    contractorTeamSize: int = Form(0),
    projectBudget: float = Form(0.0),
    weather: str = Form(""),
    region_risk: str = Form(""),
    notes: str = Form(""),
    projectName: str = Form(""),
    projectType: str = Form(""),
    location: str = Form(""),
    startDate: str = Form(""),
    endDate: str = Form("")
):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="CSV file not found")

    df_hist = pd.read_csv(filepath)
    df_hist.columns = [c.strip() for c in df_hist.columns]

    print("=== Debug: /recommendation called ===")
    print("Filename:", filename)
    print("Raw Material Field:", materials)

    # ✅ Parse materials JSON
    try:
        material_list = json.loads(materials)
    except:
        print("❌ JSON parse fail, fallback to single material")
        material_list = [{"material": materials}]

    print("Parsed materials:", material_list)

    all_forecasts = []
    all_recs = []
    all_bulk_orders = []

    try:
        for matObj in material_list:
            mat = matObj["material"]
            hm = int(matObj.get("horizon_months", horizon_months))
            ltd = int(matObj.get("lead_time_days", lead_time_days))
            inv = float(matObj.get("current_inventory", current_inventory))
            sr = float(matObj.get("supplierReliability", supplierReliability))
            dtd = float(matObj.get("deliveryTimeDays", deliveryTimeDays))
            cts = int(matObj.get("contractorTeamSize", contractorTeamSize))
            pb = float(matObj.get("projectBudget", projectBudget))

            print(f"\n📦 Running forecast for material: {mat}")

            forecast_df = generate_forecast(df_hist, mat, hm)

            current_project_data = pd.DataFrame({
                "material": [mat] * len(forecast_df),
                "forecast_date": forecast_df['forecast_date'],
                "lead_time_days": [ltd] * len(forecast_df),
                "current_inventory": [inv] * len(forecast_df),
                "supplier_reliability": [sr] * len(forecast_df),
                "delivery_time_days": [dtd] * len(forecast_df),
                "contractor_team_size": [cts] * len(forecast_df),
                "project_budget": [pb] * len(forecast_df),
                "weather": [weather] * len(forecast_df),
                "region_risk": [region_risk] * len(forecast_df),
                "notes": [notes] * len(forecast_df),
                "project_name": [projectName] * len(forecast_df),
                "project_type": [projectType] * len(forecast_df),
                "location": [location] * len(forecast_df),
                "start_date": [startDate] * len(forecast_df),
                "end_date": [endDate] * len(forecast_df),
                "forecasted_demand": forecast_df['yhat']
            })

            # --- Handle possible tuple return from generate_procurement_recommendations ---
            rec_out = generate_procurement_recommendations(
                forecast_df=forecast_df,
                current_project_data=current_project_data,
                lead_time_days=ltd,
                current_inventory=inv
            )

            if isinstance(rec_out, (tuple, list)):
                rec_df = rec_out[0] if rec_out[0] is not None else pd.DataFrame()
                bulk_orders_df = rec_out[1] if len(rec_out) > 1 and rec_out[1] is not None else pd.DataFrame()
            else:
                rec_df = rec_out if isinstance(rec_out, pd.DataFrame) else pd.DataFrame(rec_out)
                bulk_orders_df = pd.DataFrame()

            all_forecasts += forecast_df.to_dict(orient="records")
            all_recs += rec_df.to_dict(orient="records")

            if not bulk_orders_df.empty:
                all_bulk_orders += bulk_orders_df.to_dict(orient="records")

        # ✅ return must be after loop & still inside try
        return {
            "forecast": all_forecasts,
            "recommendations": all_recs,
            "bulk_orders": all_bulk_orders
        }

    except Exception as e:
        import traceback
        print("🔥🔥 ERROR IN /recommendation 🔥🔥")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- Combined dashboard payload endpoint ---
@app.post("/dashboard-data")
def dashboard_data(
    filename: str = Form(...),
    materials: str = Form("[]"),
    horizon_months: int = Form(6),
    lead_time_days: int = Form(10),
    current_inventory: float = Form(0.0),
    supplierReliability: float = Form(100.0),
    deliveryTimeDays: float = Form(0.0),
    contractorTeamSize: int = Form(0),
    projectBudget: float = Form(0.0),
    weather: str = Form(""),
    region_risk: str = Form(""),
    notes: str = Form(""),
    projectName: str = Form(""),
    projectType: str = Form(""),
    location: str = Form(""),
    startDate: str = Form(""),
    endDate: str = Form("")
):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="CSV file not found")

    # read and normalize header spacing
    df_hist = pd.read_csv(filepath)
    df_hist.columns = [c.strip() for c in df_hist.columns]

    # normalize common misspellings / variants to canonical names used downstream
    rename_map = {
        "Date_of_Materail_Usage": "Date_of_Material_Usage",
        "Supllier_Reliability_Score": "Supplier_Reliability_Score",
        "Supplier_Name": "Supplier_Name",
        "Material_Name": "Material_Name",
        "Quantity_Used": "Quantity_Used"
    }
    df_hist.rename(columns=rename_map, inplace=True)

    # defensive: ensure any missing expected cols exist (with safe defaults)
    if "Material_Name" not in df_hist.columns:
        df_hist["Material_Name"] = ""
    if "Quantity_Used" not in df_hist.columns:
        df_hist["Quantity_Used"] = 0
    # keep original copy for safety
    df_hist_raw = df_hist.copy()

    # parse materials param (JSON string expected)
    try:
        material_list = json.loads(materials)
    except Exception:
        print("❌ JSON parse fail for materials; falling back to single-element list")
        material_list = [materials]

    all_forecasts = []
    all_recs = []
    all_bulk_orders = []
    all_hist = []

    # feature importance accumulator (will compute per-material then aggregate)
    feature_scores_acc = {
        "seasonality": [],
        "past_consumption": [],
        "supplier_reliability": [],
        "weather": [],
        "regional_risk": []
    }

    for matObj in material_list:
        mat = matObj["material"] if isinstance(matObj, dict) else matObj
        mat = str(mat).strip()
        print(f"\n📦 Dashboard: processing material: {mat}")

        # --- Forecast generation (keep your existing generate_forecast) ---
        try:
            forecast_df = generate_forecast(df_hist_raw.copy(), mat, horizon_months)
            print(f"Forecast rows for {mat}: {len(forecast_df)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Forecast failed for {mat}: {e}")

        # ensure forecast_df has columns we expect
        if "forecast_date" not in forecast_df.columns and "ds" in forecast_df.columns:
            forecast_df = forecast_df.rename(columns={"ds": "forecast_date"})
        if "yhat" not in forecast_df.columns and "forecasted" in forecast_df.columns:
            forecast_df["yhat"] = forecast_df["forecasted"]

        # --- Build current_project_data with identical-length arrays to avoid pandas length errors ---
        forecast_len = len(forecast_df)
        try:
            current_project_data = pd.DataFrame({
                "material": [mat] * forecast_len,
                "forecast_date": forecast_df["forecast_date"].values,
                "lead_time_days": [lead_time_days] * forecast_len,
                "current_inventory": [current_inventory] * forecast_len,
                "supplier_reliability": [supplierReliability] * forecast_len,
                "delivery_time_days": [deliveryTimeDays] * forecast_len,
                "contractor_team_size": [contractorTeamSize] * forecast_len,
                "project_budget": [projectBudget] * forecast_len,
                "weather": [weather] * forecast_len,
                "region_risk": [region_risk] * forecast_len,
                "notes": [notes] * forecast_len,
                "project_name": [projectName] * forecast_len,
                "project_type": [projectType] * forecast_len,
                "location": [location] * forecast_len,
                "start_date": [startDate] * forecast_len,
                "end_date": [endDate] * forecast_len,
                "forecasted_demand": forecast_df["yhat"].values if "yhat" in forecast_df.columns else forecast_df.iloc[:, 1].values
            })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Project context DF build failed for {mat}: {e}")

        # --- Generate recommendations (supports both tuple and single-return implementations) ---
        try:
            rec_out = generate_procurement_recommendations(
                forecast_df=forecast_df,
                current_project_data=current_project_data,
                lead_time_days=lead_time_days,
                current_inventory=current_inventory
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Recommendation failed for {mat}: {e}")

        # handle cases: function can return (rec_df, bulk_df) or just rec_df
        rec_df = pd.DataFrame()
        bulk_orders_df = pd.DataFrame()
        if isinstance(rec_out, tuple) or isinstance(rec_out, list):
            # expect (rec_df, bulk_orders_df)
            try:
                rec_df = rec_out[0] if rec_out[0] is not None else pd.DataFrame()
                bulk_orders_df = rec_out[1] if len(rec_out) > 1 and rec_out[1] is not None else pd.DataFrame()
            except Exception:
                # fallback if returned weird object
                if hasattr(rec_out, "to_dict"):
                    rec_df = pd.DataFrame(rec_out)
                else:
                    rec_df = pd.DataFrame()
        else:
            # single return (DataFrame-like)
            try:
                rec_df = rec_out if isinstance(rec_out, pd.DataFrame) else pd.DataFrame(rec_out)
            except Exception:
                rec_df = pd.DataFrame()

        # Make sure forecasted_demand exists in rec_df (rename if necessary)
        if "yhat" in rec_df.columns and "forecasted_demand" not in rec_df.columns:
            rec_df = rec_df.rename(columns={"yhat": "forecasted_demand"})
        if "recommended_order_quantity" not in rec_df.columns and "recommended_order_quantity" in rec_df.columns:
            pass  # already good
        # If recommended_order_quantity missing but 'recommended_order' exists (older keys), try rename
        if "recommended_order_quantity" not in rec_df.columns and "recommended_order" in rec_df.columns:
            rec_df = rec_df.rename(columns={"recommended_order": "recommended_order_quantity"})

        # --- Post-process rec_df: urgency & insight_reason (safe defaults) ---
        if not rec_df.empty:
            # ensure numeric forecasted_demand column
            rec_df["forecasted_demand"] = pd.to_numeric(rec_df["forecasted_demand"].fillna(0), errors="coerce").fillna(0)
            rec_df["recommended_order_quantity"] = pd.to_numeric(rec_df.get("recommended_order_quantity", 0), errors="coerce").fillna(0)

            rec_df["urgency"] = rec_df.apply(
                lambda row: "critical"
                if current_inventory < row["forecasted_demand"] * 0.5
                else ("urgent" if current_inventory < row["forecasted_demand"] * 1.2 else "ok"),
                axis=1,
            )

            rec_df["insight_reason"] = rec_df["urgency"].map({
                "critical": "Low stock vs forecast",
                "urgent": "Stock nearing forecast threshold",
                "ok": "Inventory level sufficient"
            })
        else:
            # keep structure consistent
            rec_df = pd.DataFrame(columns=["material", "forecast_date", "forecasted_demand",
                                           "recommended_order_quantity", "recommended_order_date",
                                           "urgency", "insight_reason"])

        # attach material column to rec_df if missing
        if "material" not in rec_df.columns:
            rec_df["material"] = mat

        # --- Append outputs to accumulators ---
        all_forecasts += forecast_df.to_dict(orient="records")
        all_recs += rec_df.to_dict(orient="records")

        if bulk_orders_df is not None and not bulk_orders_df.empty:
            # annotate related materials for the bulk order
            bulk_orders_df = bulk_orders_df.copy()
            bulk_orders_df["related_materials"] = ", ".join(current_project_data["material"].unique())
            all_bulk_orders += bulk_orders_df.to_dict(orient="records")

        # --- Historical aggregation for this material (monthly) ---
        try:
            # normalize date column names (accept both spelled variants)
            df_local = df_hist_raw.copy()
            if "Date_of_Material_Usage" in df_local.columns:
                df_local = df_local.rename(columns={"Date_of_Material_Usage": "date"})
            elif "Date_of_Materail_Usage" in df_local.columns:
                df_local = df_local.rename(columns={"Date_of_Materail_Usage": "date"})

            df_local["date"] = pd.to_datetime(df_local["date"], errors="coerce")
            df_local["Quantity_Used"] = pd.to_numeric(df_local.get("Quantity_Used", 0), errors="coerce").fillna(0)
            df_local["Material_Name"] = df_local["Material_Name"].astype(str).str.strip().str.lower()

            mat_lower = mat.strip().lower()
            df_mat = df_local[df_local["Material_Name"] == mat_lower]

            if not df_mat.empty:
                hist_monthly = df_mat.set_index("date").resample('M')["Quantity_Used"].sum().reset_index()
                hist_monthly.rename(columns={"Quantity_Used": "quantity"}, inplace=True)
                # attach material to each row for frontend convenience
                for row in hist_monthly.to_dict(orient="records"):
                    row["material"] = mat
                    all_hist.append(row)
            else:
                print(f"⚠️ No historical data found for {mat}")
        except Exception as e:
            print(f"❌ Historical aggregation failed for {mat}: {e}")

        # --- Feature importance heuristics for this material (safe/simple) ---
        try:
            # seasonality: compare month-to-month variance vs overall variance
            season_score = 0.0
            if "forecast_date" in forecast_df.columns and not forecast_df["forecast_date"].isna().all():
                f = forecast_df.copy()
                f["forecast_date"] = pd.to_datetime(f["forecast_date"], errors="coerce")
                f["month"] = f["forecast_date"].dt.month
                month_means = f.groupby("month")["yhat"].mean()
                if not month_means.empty:
                    season_score = float(min(1.0, (month_means.std() / (month_means.mean() + 1e-6)) ))
            # past consumption: correlation of lag-1 (autocorr) as proxy
            past_score = 0.0
            if not df_mat.empty:
                q = df_mat.sort_values("date")["quantity"] if "quantity" in locals() else df_mat.sort_values("date")["Quantity_Used"]
                if len(q) >= 3:
                    past_score = abs(q.pct_change().fillna(0).autocorr(lag=1)) if hasattr(q.pct_change(), "autocorr") else float(min(1.0, q.std() / (q.mean() + 1e-6)))
                else:
                    past_score = 0.1
            # supplier reliability: use provided supplierReliability value if present in matObj or current_project_data
            supplier_score = 0.0
            if ("Supplier_Reliability_Score" in df_local.columns) or ("supplier_reliability" in current_project_data.columns):
                try:
                    sr_vals = pd.to_numeric(df_local.get("Supplier_Reliability_Score", pd.Series([supplierReliability])), errors="coerce").fillna(supplierReliability)
                    supplier_score = float(min(1.0, (100.0 - sr_vals.mean()) / 100.0))  # more unreliability increases importance
                except Exception:
                    supplier_score = 0.1
            # weather/regional risk: check if columns exist and have variance
            weather_score = 0.0
            if "Weather_Condition" in df_local.columns:
                weather_score = 0.2
            regional_score = 0.0
            if "Regional_Risk_Level" in df_local.columns:
                regional_score = 0.1

            # clamp and accumulate
            feature_scores_acc["seasonality"].append(max(0.0, min(1.0, season_score)))
            feature_scores_acc["past_consumption"].append(max(0.0, min(1.0, past_score)))
            feature_scores_acc["supplier_reliability"].append(max(0.0, min(1.0, supplier_score)))
            feature_scores_acc["weather"].append(max(0.0, min(1.0, weather_score)))
            feature_scores_acc["regional_risk"].append(max(0.0, min(1.0, regional_score)))
        except Exception as e:
            print(f"❌ Feature importance calc failed for {mat}: {e}")
            # append small defaults
            feature_scores_acc["seasonality"].append(0.1)
            feature_scores_acc["past_consumption"].append(0.1)
            feature_scores_acc["supplier_reliability"].append(0.05)
            feature_scores_acc["weather"].append(0.05)
            feature_scores_acc["regional_risk"].append(0.02)

    # --- Inventory optimization insights (aggregate) ---
    # Use get with defaults to avoid KeyError if structure changed upstream
    total_forecast = sum([r.get("forecasted_demand", 0) for r in all_recs]) if all_recs else 0
    total_recommended = sum([r.get("recommended_order_quantity", 0) for r in all_recs]) if all_recs else 0

    insights = []
    if total_recommended > total_forecast and total_forecast > 0:
        insights.append("Bulk orders exceed forecast — consider splitting orders or adjusting suppliers.")
    if any(r.get("urgency") == "critical" for r in all_recs):
        insights.append("⚠️ Some materials are critically low — prioritize replenishment.")
    if supplierReliability < 80:
        insights.append("Supplier reliability below 80% — add safety stock.")
    if str(weather).lower() in ["rainy", "humid"]:
        insights.append("Weather/region risk high — allow for delivery delays.")
    if not insights:
        insights.append("Looks good. Monitor monthly usage and supplier performance.")

    # --- Aggregate feature importance across materials (average & normalize to percent) ---
    def avg_safe(lst):
        return float(sum(lst) / len(lst)) if lst else 0.0

    raw_scores = {
        "seasonality": avg_safe(feature_scores_acc["seasonality"]),
        "past_consumption": avg_safe(feature_scores_acc["past_consumption"]),
        "supplier_reliability": avg_safe(feature_scores_acc["supplier_reliability"]),
        "weather": avg_safe(feature_scores_acc["weather"]),
        "regional_risk": avg_safe(feature_scores_acc["regional_risk"])
    }
    # normalize to 100%
    total_raw = sum(raw_scores.values()) or 1.0
    feature_importance = { 
        "Seasonality": round((raw_scores["seasonality"] / total_raw) * 100, 1),
        "Past Consumption": round((raw_scores["past_consumption"] / total_raw) * 100, 1),
        "Supplier Reliability": round((raw_scores["supplier_reliability"] / total_raw) * 100, 1),
        "Weather Impact": round((raw_scores["weather"] / total_raw) * 100, 1),
        "Regional Risk": round((raw_scores["regional_risk"] / total_raw) * 100, 1)
    }

    # --- Final summary (preserve your previous fields) ---
    summary = {
        "total_forecast_tons": round(total_forecast, 2),
        "total_recommended_tons": round(total_recommended, 2),
        "avg_supplier_reliability": supplierReliability,
        "budget": projectBudget,
        "lead_time_days": lead_time_days,
        "insights": insights,
        "feature_importance": feature_importance  # keep it inside summary
        }

    print("🔥 Feature Importance Computed:", feature_importance)
    # ✅ Return regular FastAPI dict (not jsonify!)
    advice = [] #placeholder
    return {
        "forecast": all_forecasts,
        "recommendations": all_recs,
        "bulk_orders": all_bulk_orders,
        "historical": all_hist,
        "summary": summary,
        "advice": advice
    }

@app.post("/smart-alert")
def smart_alert(
    projectName: str = Form(...),
    location: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    projectPhase: str = Form(...),
    structureType: str = Form(...),
    materials: str = Form("[]")
):
    try:
        import json
        materials_list = json.loads(materials) if materials else []
        project = {
            "projectName": projectName,
            "location": location,
            "latitude": latitude,
            "longitude": longitude,
            "phase": projectPhase,
            "structure_type": structureType,
            "materials": materials_list
        }
        result = predict_risk(project)
        return result
    except Exception as e:
        return {"error": str(e)}
    
# @app.post("/recovery-steps")
# def recovery_steps(
#     projectPhase: str = Form(...),
#     structureType: str = Form(...),
#     riskLevel: str = Form(...)
# ):
#     """
#     Provides recommended recovery steps when project work is affected.
#     """
#     try:
#         tips = recovery_guidance(projectPhase, structureType, riskLevel)
#         return {"phase": projectPhase, "structure": structureType, "tips": tips}
#     except Exception as e:
#         return {"error": str(e)}
    
# @app.post("/recovery-smart")
# def recovery_smart(
#     projectName: str = Form(...),
#     location: str = Form(...),
#     latitude: float = Form(...),
#     longitude: float = Form(...),
#     projectPhase: str = Form(...),
#     structureType: str = Form(...),
#     materials: str = Form("[]"),
#     riskLevel: str = Form(...),
# ):
#     """
#     Smart recovery guidance endpoint.
#     Combines ML-based recovery advisor + rule-based fallback for multi-phase civil projects.
#     Automatically uses latest weather context.
#     """
#     try:
#         import json

#         materials_list = json.loads(materials) if materials else []
#         project = {
#             "projectName": projectName,
#             "location": location,
#             "latitude": latitude,
#             "longitude": longitude,
#             "phase": projectPhase,
#             "structure_type": structureType,
#             "materials": materials_list,
#         }

#         # 🔁 Intelligent recovery logic
#         tips = predict_recovery_action(project, riskLevel)

#         return {
#             "project": projectName,
#             "phase": projectPhase,
#             "structure": structureType,
#             "risk_level": riskLevel,
#             "tips": tips,
#         }

#     except Exception as e:
#         import traceback
#         traceback.print_exc()
#         return {"error": f"Recovery smart endpoint failed: {str(e)}"}

@app.post("/smart-alert-v3")
def smart_alert_v3(payload: dict = Body(...)):
    """
    Dashboard auto alert endpoint.
    Expects:
      {
        "projectName": "",
        "location": "",
        "latitude": 0.0,
        "longitude": 0.0,
        "phase": "",
        "structure_type": "",
        "materials": []
      }
    """
    try:
        result = predict_risk(payload)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/smart-ai-alert")
def smart_ai_alert(payload: dict = Body(...)):
    """
    Fully adaptive Gemini-powered project analysis.
    Optionally accepts aggregated CSV insights too.
    """
    try:
        project = payload.get("project", payload)
        csv_summary = payload.get("csv_summary", {})
        result = ai_dynamic_risk_analysis(project, csv_summary)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/recovery-smart-v3")
def recovery_smart_v3(payload: dict = Body(...)):
    try:
        project = payload.get("project", {})
        loss_report = payload.get("loss_report", {})
        user = payload.get("user", {})
        csv_summary = payload.get("csv_summary", {})
        # 1) First, call heuristic recovery (existing)
        tips = generate_recovery_plan(project, loss_report)

        # 2) Ask AI for extra recovery plan using CSV/context
        ai_out = ai_dynamic_risk_analysis(project, csv_summary)
        # merge suggestions (AI may be richer)
        merged = {
            "heuristic_tips": tips,
            "ai_insights": ai_out,
        }
        log_incident(project, loss_report, user)
        return {"tips": merged["heuristic_tips"], "ai_insights": merged["ai_insights"], "logged": True}
    except Exception as e:
        return {"error": str(e)}

    
