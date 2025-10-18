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



# main FastAPI app
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import json
from ml.forecast import generate_forecast
from ml.recommendation import generate_procurement_recommendations

app = FastAPI(title="PrediChain Backend", version="1.0")

# --- Directories ---
UPLOAD_DIR = "data/uploads"
PROJECTS_FILE = "data/projects.json"
os.makedirs(UPLOAD_DIR, exist_ok=True)

if not os.path.exists(PROJECTS_FILE):
    with open(PROJECTS_FILE, "w") as f:
        json.dump([], f)

# --- CORS ---
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- Project Management ---
@app.get("/projects")
def get_projects():
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
    Upload historical CSV with template columns.
    """
    filepath = os.path.join(UPLOAD_DIR, file.filename)
    contents = await file.read()
    df = pd.read_csv(pd.io.common.BytesIO(contents))
    df.columns = [c.strip() for c in df.columns]
    
    required_cols = [
        "Project_ID", "Project_Name", "Project_Type", "Project_Size", "Location",
        "Start_Date", "End_Date", "Budget_Planned_Quantity", "Material_Name",
        "Quantity_Used", "Planned_Quantity", "Unit", "Supplier_Name",
        "Supllier_Reliability_Score", "Average_Delivery_Time_Days", "Delivery_Delays",
        "Contractor_Team_Size", "Number_of_Shifts_Work_Hours", "Weather_Condition",
        "Regional_Risk_Level", "Notes_Special_Conditions", "Project_Phase",
        "Date_of_Materail_Usage"
    ]
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"CSV missing columns: {missing_cols}")
    
    with open(filepath, "wb") as f:
        f.write(contents)
    return {"message": "File uploaded successfully", "filename": file.filename}

# --- Forecast Endpoint ---
@app.post("/forecast")
def forecast(
    filename: str = Form(...),
    material: str = Form(...),
    horizon_months: int = Form(6)
):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        return JSONResponse(status_code=404, content={"error": "File not found"})
    
    df = pd.read_csv(filepath)
    df.columns = [c.strip() for c in df.columns]
    
    forecast_df = generate_forecast(df, material, horizon_months)
    return forecast_df.to_dict(orient="records")

# --- Recommendation Endpoint ---
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
    Generate forecast + procurement recommendation for current project
    using historical CSV + user inputs from frontend.
    """
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="CSV file not found")

    df_hist = pd.read_csv(filepath)
    df_hist.columns = [c.strip() for c in df_hist.columns]

    # Forecast
    forecast_df = generate_forecast(df_hist, material, horizon_months)

    # Prepare current project info for recommendation
    current_project_data = pd.DataFrame({
        "material": [material]*len(forecast_df),
        "forecast_date": forecast_df['forecast_date'],
        "lead_time_days": [lead_time_days]*len(forecast_df),
        "current_inventory": [current_inventory]*len(forecast_df),
        "supplier_reliability": [supplierReliability]*len(forecast_df),
        "delivery_time_days": [deliveryTimeDays]*len(forecast_df),
        "contractor_team_size": [contractorTeamSize]*len(forecast_df),
        "project_budget": [projectBudget]*len(forecast_df),
        "weather": [weather]*len(forecast_df),
        "region_risk": [region_risk]*len(forecast_df),
        "notes": [notes]*len(forecast_df),
        "project_name": [projectName]*len(forecast_df),
        "project_type": [projectType]*len(forecast_df),
        "location": [location]*len(forecast_df),
        "start_date": [startDate]*len(forecast_df),
        "end_date": [endDate]*len(forecast_df),
        "forecasted_demand": forecast_df['yhat']
    })

    # Recommendation
    recommendation_df = generate_procurement_recommendations(
        forecast_df=current_project_data,
        lead_time_days=lead_time_days,
        current_inventory=current_inventory
    )

    return {
        "forecast": forecast_df.to_dict(orient="records"),
        "recommendations": recommendation_df.to_dict(orient="records")
    }