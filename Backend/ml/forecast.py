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
    # Required columns
    required_cols = ["Date_of_Materail_Usage", "Quantity_Used", "Material_Name"]
    df_clean = clean_and_validate_data(df, required_cols)

    # Optional regressors from historical CSV
    optional_cols = [
        "Weather_Condition", "Regional_Risk_Level", "Delivery_Delays",
        "Average_Delivery_Time_Days", "Contractor_Team_Size", "Number_of_Shifts_Work_Hours"
    ]
    for col in optional_cols:
        if col not in df_clean.columns:
            df_clean[col] = 0  # Fill missing optional features with default

    # Filter for the selected material
    df_material = df_clean[df_clean["Material_Name"].str.lower() == material.lower()]
    if df_material.empty:
        raise ValueError(f"No data found for material '{material}' after filtering.")

    # Prepare dataframe for Prophet
    df_prophet = df_material.rename(columns={"Date_of_Materail_Usage": "ds", "Quantity_Used": "y"})
    df_prophet = df_prophet[["ds", "y"] + optional_cols].sort_values("ds")
    df_prophet['ds'] = pd.to_datetime(df_prophet['ds'])

    # Prophet model
    model = Prophet(yearly_seasonality=True)
    for col in optional_cols:
        model.add_regressor(col)
    model.fit(df_prophet)

    # Future dataframe
    future = model.make_future_dataframe(periods=horizon_months*30, freq='D')
    for col in optional_cols:
        # Use historical mean for future regressors
        future[col] = df_prophet[col].mean()
    
    forecast = model.predict(future)

    # Aggregate to monthly
    forecast_out = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(horizon_months*30)
    forecast_out['ds'] = pd.to_datetime(forecast_out['ds'])
    monthly_forecast = forecast_out.set_index('ds').resample('M').agg({
        'yhat': 'sum',
        'yhat_lower': 'mean',
        'yhat_upper': 'mean'
    }).reset_index()
    monthly_forecast["material"] = material
    monthly_forecast.rename(columns={'ds': 'forecast_date'}, inplace=True)

    # Save CSV
    out_path = os.path.join(FORECAST_DIR, f"{material}_forecast.csv")
    monthly_forecast.to_csv(out_path, index=False)

    return monthly_forecast