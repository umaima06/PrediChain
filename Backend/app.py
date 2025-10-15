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
import pandas as pd
import os
from ml.forecast import generate_forecast
from ml.recommendation import generate_procurement_recommendations

app = FastAPI(title="PrediChain Backend", version="1.0")

UPLOAD_DIR = "data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/upload-data")
async def upload_data(file: UploadFile = File(...)):
    filepath = os.path.join(UPLOAD_DIR, file.filename)
    with open(filepath, "wb") as f:
        f.write(await file.read())
    return {"message": "File uploaded successfully", "filename": file.filename}

@app.post("/forecast")
def forecast(filename: str = Form(...), material: str = Form(...), horizon_months: int = Form(6)):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        return JSONResponse(status_code=404, content={"error": "File not found"})
    try:
        # Robust CSV reading: sep=',', skipinitialspace=True, engine='python'
        df = pd.read_csv(filepath, sep=',', skipinitialspace=True, engine='python') 
        
        # Clean column names (removes the 'date' column spacing issue)
        df.columns = df.columns.str.strip()
        
        # Drop the unwanted 'Unnamed' index column
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')] 

        forecast_df = generate_forecast(df, material, horizon_months)
        return forecast_df.to_dict(orient="records")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/recommendation") 
def recommend_procurement(
    filename: str = Form(...), 
    material: str = Form(...), 
    horizon_months: int = Form(6),
    lead_time_days: int = Form(10), 
    current_inventory: float = Form(0.0) 
):
    """
    Generates material demand forecast and then provides actionable procurement recommendations.
    """
    # FILEPATH DEFINED HERE (MUST BE OUTSIDE THE TRY BLOCK)
    filepath = os.path.join(UPLOAD_DIR, filename) 
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
        
    try:
        # Step 1: Read the data with robust fixes
        df = pd.read_csv(filepath, sep=',', skipinitialspace=True, engine='python')
        
        # Clean column names
        df.columns = df.columns.str.strip()
        
        # Drop the unwanted 'Unnamed' index column
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')] 
        
        # Step 2: Generate the monthly forecast (using the existing core logic)
        forecast_df = generate_forecast(df, material, horizon_months)
        
        # Step 3: Generate the procurement recommendation
        recommendation_df = generate_procurement_recommendations(
            forecast_df, 
            lead_time_days=lead_time_days, 
            current_inventory=current_inventory
        )
        
        return recommendation_df.to_dict(orient="records")
        
    except ValueError as ve:
        # Catch validation errors from utils/forecast (like the date format error)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Catch any other unexpected errors
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error during recommendation generation: {e}")