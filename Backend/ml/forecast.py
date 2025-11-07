import pandas as pd
from prophet import Prophet
import os
from .utils import clean_and_validate_data

FORECAST_DIR = "data/forecasts"
os.makedirs(FORECAST_DIR, exist_ok=True)

def generate_forecast(df: pd.DataFrame, material: str, horizon_months: int = 6):
    """
    Generates monthly forecast from historical CSV for a given material.
    Uses optional regressors if available in the historical CSV.
    """

   # 🧹 Step 1: Normalize date column naming
    if "Date_of_Materail_Usage" in df.columns:
      df.rename(columns={"Date_of_Materail_Usage": "date"}, inplace=True)
    elif "Date_of_Material_Usage" in df.columns:
      df.rename(columns={"Date_of_Material_Usage": "date"}, inplace=True)

    # ✅ Required columns (your actual CSV headers)
    required_cols = ["date", "Quantity_Used", "Material_Name"]

    # ✅ Clean + validate via utils
    df_clean = clean_and_validate_data(df, required_cols)

    # ✅ Make sure material names are clean lowercase
    df_clean["Material_Name"] = df_clean["Material_Name"].astype(str).str.strip().str.lower()

    # 🧩 Optional regressors
    optional_cols = [
        "Weather_Condition", "Regional_Risk_Level", "Delivery_Delays",
        "Average_Delivery_Time_Days", "Contractor_Team_Size", "Number_of_Shifts_Work_Hours"
    ]
    for col in optional_cols:
        if col not in df_clean.columns:
            df_clean[col] = 0

    # 🎯 Filter for selected material (case-insensitive)
    material_lower = material.strip().lower()
    df_material = df_clean[df_clean["Material_Name"] == material_lower]
    
    print("🧾 Materials available in CSV:", df_clean["Material_Name"].unique())
    print("🔍 User searched for:", material)

    if df_material.empty:
       print(f"⚠️ No data found for material '{material}', using overall project trends instead.")
    # use all materials for generic forecast
       df_material = df_clean.copy()
       df_material["Material_Name"] = material  # tag as current material

    # 🔄 Prepare for Prophet
    df_prophet = df_material.rename(columns={"date": "ds", "Quantity_Used": "y"})
    df_prophet = df_prophet[["ds", "y"] + optional_cols].sort_values("ds")
    df_prophet['ds'] = pd.to_datetime(df_prophet['ds'])

    # 🔮 Prophet model
    model = Prophet(yearly_seasonality=True)
    for col in optional_cols:
        model.add_regressor(col)
        print("⚡ df_prophet shape:", df_prophet.shape)
        print(df_prophet.head())
    model.fit(df_prophet)

    # 🧠 Generate future predictions
    future = model.make_future_dataframe(periods=horizon_months * 30, freq='D')
    for col in optional_cols:
        future[col] = df_prophet[col].mean()

    forecast = model.predict(future)

    # 📅 Aggregate to monthly
    forecast_out = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    forecast_out['ds'] = pd.to_datetime(forecast_out['ds'])

# Aggregate properly from the end of your dataset
    last_date = df_prophet['ds'].max()
    future_months = pd.date_range(last_date, periods=horizon_months, freq='M')

    monthly_forecast = (
        forecast_out.set_index('ds')
        .resample('M')
        .sum()
        .loc[future_months]
        .reset_index()
        )
    monthly_forecast["material"] = material
    monthly_forecast.rename(columns={'ds': 'forecast_date'}, inplace=True)

    # 💾 Save result CSV
    out_path = os.path.join(FORECAST_DIR, f"{material}_forecast.csv")
    monthly_forecast.to_csv(out_path, index=False)

    forecast_out = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()

    # --- AFTER ALL RESAMPLING / CLEANING ---
    # Make sure the output has required columns for recommendation
    if "ds" in forecast_out.columns:
        forecast_out.rename(columns={"ds": "forecast_date"}, inplace=True)

    if "forecast_date" not in forecast_out.columns:
        forecast_out.reset_index(inplace=True)
        if "index" in forecast_out.columns:
            forecast_out.rename(columns={"index": "forecast_date"}, inplace=True)

    # Add material column
    forecast_out["material"] = material

    # Keep only the columns needed downstream
    required_cols = ["forecast_date", "yhat", "material"]
    forecast_out = forecast_out[[col for col in required_cols if col in forecast_out.columns]]

    print("✅ Final Forecast Columns:", forecast_out.columns.tolist())
    print(f"✅ Final Forecast Shape: {forecast_out.shape}")

    return forecast_out

    return monthly_forecast