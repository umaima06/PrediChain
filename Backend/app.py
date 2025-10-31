# # main FastAPI app
# from fastapi import FastAPI, File, UploadFile, Form, HTTPException
# from fastapi.responses import JSONResponse
# import pandas as pd
# import os
# from ml.forecast import generate_forecast
# from ml.recommendation import generate_procurement_recommendations

# app = FastAPI(title="PrediChain Backend", version="1.0")

# UPLOAD_DIR = "data/uploads"
# os.makedirs(UPLOAD_DIR, exist_ok=True)

# @app.get("/health")
# def health_check():
#     return {"status": "ok"}

# @app.post("/upload-data")
# async def upload_data(file: UploadFile = File(...)):
#     filepath = os.path.join(UPLOAD_DIR, file.filename)
#     with open(filepath, "wb") as f:
#         f.write(await file.read())
#     return {"message": "File uploaded successfully", "filename": file.filename}

# @app.post("/forecast")
# def forecast(filename: str = Form(...), material: str = Form(...), horizon_months: int = Form(6)):
#     filepath = os.path.join(UPLOAD_DIR, filename)
#     if not os.path.exists(filepath):
#         return JSONResponse(status_code=404, content={"error": "File not found"})
#     try:
#         # ULTIMATE FIX: 
#         # 1. Use engine='python' for better error handling (though slower).
#         # 2. Add skipinitialspace=True to clean up header whitespace.
#         df = pd.read_csv(filepath, sep=',', skipinitialspace=True, engine='python') 
        
#         # Remove any leading/trailing whitespace from column names just in case
#         df.columns = df.columns.str.strip()
        
#         # FIX: Drop any column starting with 'Unnamed:' (This is still necessary)
#         df = df.loc[:, ~df.columns.str.contains('^Unnamed')] 

#         forecast_df = generate_forecast(df, material, horizon_months)
#         return forecast_df.to_dict(orient="records")
#     except Exception as e:
#         return JSONResponse(status_code=500, content={"error": str(e)})

# @app.post("/recommendation") 
# def recommend_procurement(
#     filename: str = Form(...), 
#     material: str = Form(...), 
#     horizon_months: int = Form(6),
#     lead_time_days: int = Form(10), 
#     current_inventory: float = Form(0.0) 
# ):
#     # ... (filepath check remains the same) ...
        
#     try:
#         # Step 1: Read the data
#         # ULTIMATE FIX: 
#         df = pd.read_csv(filepath, sep=',', skipinitialspace=True, engine='python')
        
#         # Remove any leading/trailing whitespace from column names just in case
#         df.columns = df.columns.str.strip()
        
#         # FIX: Drop any column starting with 'Unnamed:' 
#         df = df.loc[:, ~df.columns.str.contains('^Unnamed')] 
        
#         # Step 2: Generate the monthly forecast (using the existing core logic)
#         forecast_df = generate_forecast(df, material, horizon_months)
#         return forecast_df.to_dict(orient="records")
#     except Exception as e:
#         return JSONResponse(status_code=500, content={"error": str(e)})

# @app.post("/recommendation") 
# def recommend_procurement(
#     filename: str = Form(...), 
#     material: str = Form(...), 
#     horizon_months: int = Form(6),
#     lead_time_days: int = Form(10), 
#     current_inventory: float = Form(0.0) 
# ):
#     """
#     Generates material demand forecast and then provides actionable procurement recommendations.
#     """
#     filepath = os.path.join(UPLOAD_DIR, filename)
#     if not os.path.exists(filepath):
#         raise HTTPException(status_code=404, detail=f"File not found: {filename}")
        
#     try:
#         # Step 1: Read the data
#         df = pd.read_csv(filepath, sep=',')
        
#         # FIX: Drop any column starting with 'Unnamed:' (the extra index column)
#         df = df.loc[:, ~df.columns.str.contains('^Unnamed')] 
        
#         # Step 2: Generate the monthly forecast (using the existing core logic)
#         forecast_df = generate_forecast(df, material, horizon_months)
        
#         # Step 3: Generate the procurement recommendation
#         recommendation_df = generate_procurement_recommendations(
#             forecast_df, 
#             lead_time_days=lead_time_days, 
#             current_inventory=current_inventory
#         )
        
#         return recommendation_df.to_dict(orient="records")
        
#     except ValueError as ve:
#         # Catch validation errors from utils/forecast
#         raise HTTPException(status_code=400, detail=str(ve))
#     except Exception as e:
#         # Catch any other unexpected errors
#         print(f"An unexpected error occurred: {e}")
#         raise HTTPException(status_code=500, detail=f"Internal server error during recommendation generation: {e}")


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

# local ML modules (keep your existing functions)
from ml.forecast import generate_forecast
from ml.recommendation import generate_procurement_recommendations

# Firebase admin token verification helper (must exist in backend/firebase_admin_auth.py)
from firebase_admin_auth import verify_firebase_token

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
    material: str = Form(...),
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
    """
    Use historical CSV + current project inputs to:
      - compute forecast (via generate_forecast)
      - prepare per-month project info
      - compute procurement recommendations (via generate_procurement_recommendations)
    Returns: { forecast: [...], recommendations: [...] }
    """
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="CSV file not found")

    df_hist = pd.read_csv(filepath)
    df_hist.columns = [c.strip() for c in df_hist.columns]

    print("=== Debug: /recommendation called ===")
    print("Filename:", filename)
    print("Material:", material)
    print("File exists:", os.path.exists(filepath))
    print("Columns in CSV:", df_hist.columns.tolist())

    try:
        # Forecast using historical CSV
        forecast_df = generate_forecast(df_hist, material, horizon_months)

        # Build current project data broadcast for recommendations
        current_project_data = pd.DataFrame({
            "material": [material] * len(forecast_df),
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

        recommendation_df = generate_procurement_recommendations(
           forecast_df=forecast_df,
           current_project_data=current_project_data,   # ✅ include this
           lead_time_days=lead_time_days,
           current_inventory=current_inventory
        )

        return {
            "forecast": forecast_df.to_dict(orient="records"),
            "recommendations": recommendation_df.to_dict(orient="records")
        }

    except Exception as e:
        import traceback
        print("🔥🔥 ERROR IN /recommendATION 🔥🔥")
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
    material: str = Form(...),
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
    """
    Returns combined payload used by the frontend dashboard:
      - forecast (monthly)
      - recommendations (rows)
      - historical (monthly aggregation)
      - summary metrics for top cards
      - advice (human-readable suggestions)
    """
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="CSV file not found")

    df_hist = pd.read_csv(filepath)
    df_hist.columns = [c.strip() for c in df_hist.columns]

    # Forecast
    try:
        forecast_df = generate_forecast(df_hist, material, horizon_months)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {e}")

    # Recommendations using the broadcast current project data
    current_project_data = pd.DataFrame({
        "material": [material] * len(forecast_df),
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

    try:
        rec_df = generate_procurement_recommendations(
        forecast_df=forecast_df,         # use actual forecast
        lead_time_days=lead_time_days,
        current_inventory=current_inventory,
        current_project_data=current_project_data  # pass project context
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation generation failed: {e}")

    # Historical aggregation (optional)
    hist_agg = []
    try:
        if 'Date_of_Materail_Usage' in df_hist.columns and 'Quantity_Used' in df_hist.columns:
            df_hist['Date_of_Materail_Usage'] = pd.to_datetime(df_hist['Date_of_Materail_Usage'])
            hist_monthly = (
                df_hist[df_hist['Material_Name'].str.lower() == material.lower()]
                .set_index('Date_of_Materail_Usage')
                .resample('M')['Quantity_Used'].sum().reset_index()
            )
            hist_monthly.rename(columns={'Date_of_Materail_Usage': 'date', 'Quantity_Used': 'quantity'}, inplace=True)
            hist_agg = hist_monthly.to_dict(orient='records')
    except Exception:
        hist_agg = []

    # Simple rule-based AI-style textual advice (expandable later)
    advice = []
    try:
        next_month_forecast = float(forecast_df['yhat'].iloc[0]) if not forecast_df.empty else 0
    except Exception:
        next_month_forecast = 0

    if current_inventory < next_month_forecast * 0.5:
        advice.append("Inventory low relative to next month's forecast — consider ordering now.")
    if supplierReliability < 80:
        advice.append("Supplier reliability below 80% — consider adding safety stock or alternate supplier.")
    if str(weather).lower() in ['rainy', 'humid'] or str(region_risk).lower() == 'high':
        advice.append("Environmental risk high — factor in delivery delays and buffer stock.")
    if not advice:
        advice.append("No immediate issues detected. Monitor monthly usage and supplier updates.")

    # Summary metrics for top cards
    total_forecast = float(forecast_df['yhat'].sum()) if not forecast_df.empty else 0

    summary = {
        "total_forecast": total_forecast,
        "current_inventory": current_inventory,
        "avg_supplier_reliability": supplierReliability,
        "budget": projectBudget,
        "lead_time_days": lead_time_days
    }

    return {
        "forecast": forecast_df.to_dict(orient="records"),
        "recommendations": rec_df.to_dict(orient="records"),
        "historical": hist_agg,
        "summary": summary,
        "advice": advice
    }

# Simple root
@app.get("/")
def root():
    return {"message": "Welcome to PrediChain Backend", "status": "running"}