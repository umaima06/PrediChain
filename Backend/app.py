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

            rec_df = generate_procurement_recommendations(
                forecast_df=forecast_df,
                current_project_data=current_project_data,
                lead_time_days=ltd,
                current_inventory=inv
            )

            all_forecasts += forecast_df.to_dict(orient="records")
            all_recs += rec_df.to_dict(orient="records")

        # ✅ return must be after loop & still inside try
        return {
            "forecast": all_forecasts,
            "recommendations": all_recs
        }

    except Exception as e:
        import traceback
        print("🔥🔥 ERROR IN /recommendation 🔥🔥")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- Historical + Forecast combined endpoint ---
@app.post("/historical_forecast")
def historical_forecast(
    filename: str = Form(...),
    material: str = Form(...),
    horizon_months: int = Form(6)
):
    """
    Returns:
      - historical: monthly aggregated historical usage for the material
      - forecast: monthly forecast (from generate_forecast)
    """
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="CSV file not found")

    df_hist = pd.read_csv(filepath)
    df_hist.columns = [c.strip() for c in df_hist.columns]

    # Historical monthly aggregation (if columns exist)
    hist_out = []
    try:
        if 'Date_of_Materail_Usage' in df_hist.columns and 'Quantity_Used' in df_hist.columns:
            df_hist['Date_of_Materail_Usage'] = pd.to_datetime(df_hist['Date_of_Materail_Usage'])
            hist_monthly = (
                df_hist[df_hist['Material_Name'].str.lower() == material.lower()]
                .set_index('Date_of_Materail_Usage')
                .resample('M')['Quantity_Used'].sum().reset_index()
            )
            hist_monthly.rename(columns={'Date_of_Materail_Usage': 'date', 'Quantity_Used': 'quantity'}, inplace=True)
            hist_out = hist_monthly.to_dict(orient='records')
    except Exception as e:
        # If aggregation fails, return empty historical array and continue to forecast
        hist_out = []

    # Forecast
    try:
        forecast_df = generate_forecast(df_hist, material, horizon_months)
        forecast_out = forecast_df.to_dict(orient='records')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {e}")

    return {"historical": hist_out, "forecast": forecast_out}

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

    df_hist = pd.read_csv(filepath)
    df_hist.columns = [c.strip() for c in df_hist.columns]

    print("=== Debug: /dashboard-data called ===")
    print("Filename:", filename)
    print("Raw material field:", materials)

    try:
        material_list = json.loads(materials)
    except:
        print("❌ JSON parse fail, fallback")
        material_list = [materials]

    # ✅ initialize outside loop
    all_forecasts = []
    all_recs = []
    all_hist = []

    # ✅ loop through materials
    for matObj in material_list:
        mat = matObj["material"] if isinstance(matObj, dict) else matObj
        print(f"\n📦 Dashboard: processing material: {mat}")

        # Forecast
        try:
            forecast_df = generate_forecast(df_hist, mat, horizon_months)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Forecast failed: {e}")

        current_project_data = pd.DataFrame({
            "material": [mat] * len(forecast_df),
            "forecast_date": forecast_df['forecast_date'],
            "lead_time_days": [lead_time_days] * len(forecast_df),
            "current_inventory": [current_inventory] * len(forecast_df),
            "supplier_reliability": [supplierReliability] * len(forecast_df),
            "delivery_time_days": [deliveryTimeDays] * len(forecast_df),
            "contractor_team_size": [contractorTeamSize] * len(forecast_df),
            "project_budget": [projectBudget] * len(forecast_df),
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

        # Recommendations
        try:
            rec_df = generate_procurement_recommendations(
                forecast_df=forecast_df,
                current_project_data=current_project_data,
                lead_time_days=lead_time_days,
                current_inventory=current_inventory
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Recommendation generation failed: {e}")

        all_forecasts += forecast_df.to_dict(orient="records")
        all_recs += rec_df.to_dict(orient="records")

        # Historical usage
        try:
            if (
                'Date_of_Materail_Usage' in df_hist.columns 
                and 'Quantity_Used' in df_hist.columns
                and 'Material_Name' in df_hist.columns
            ):
                df_hist['Date_of_Materail_Usage'] = pd.to_datetime(df_hist['Date_of_Materail_Usage'])
                hist_monthly = (
                    df_hist[df_hist['Material_Name'].str.lower() == mat.lower()]
                    .set_index('Date_of_Materail_Usage')
                    .resample('M')['Quantity_Used'].sum().reset_index()
                )
                hist_monthly.rename(columns={'Date_of_Materail_Usage': 'date', 'Quantity_Used': 'quantity'}, inplace=True)
                all_hist += hist_monthly.to_dict(orient='records')
        except Exception:
            pass

    # ✅ Summary / advice section remains outside loop
    total_forecast = sum([row["yhat"] for row in all_forecasts]) if all_forecasts else 0

    advice = []
    next_month_forecast = float(all_forecasts[0]["yhat"]) if all_forecasts else 0

    if current_inventory < next_month_forecast * 0.5:
        advice.append("Inventory low — order soon.")
    if supplierReliability < 80:
        advice.append("Supplier reliability below 80% — add safety stock.")
    if str(weather).lower() in ['rainy', 'humid'] or str(region_risk).lower() == 'high':
        advice.append("Weather/region risk high — keep buffer stock.")
    if not advice:
        advice.append("Looks good. Monitor monthly usage.")

    summary = {
        "total_forecast": total_forecast,
        "current_inventory": current_inventory,
        "avg_supplier_reliability": supplierReliability,
        "budget": projectBudget,
        "lead_time_days": lead_time_days
    }

    return {
        "forecast": all_forecasts,
        "recommendations": all_recs,
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

    