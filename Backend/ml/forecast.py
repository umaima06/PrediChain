import pandas as pd
from prophet import Prophet
import os
from .utils import clean_and_validate_data 

FORECAST_DIR = "data/forecasts"
os.makedirs(FORECAST_DIR, exist_ok=True)

def generate_forecast(df: pd.DataFrame, material: str, horizon_months: int = 6):
    
    required_cols = ["date", "material", "quantity_used", "rainfall_mm"] 
    # 1. Cleaning and Validation
    df_clean = clean_and_validate_data(df, required_cols) 
    
    # 2. Filter for the specific material
    df_material = df_clean[df_clean["material"].str.lower() == material.lower()]
    if df_material.empty:
        raise ValueError(f"No data found for material '{material}' after cleaning and filtering.")

    # 3. Prepare data for Prophet (ds, y)
    df_prophet = df_material.rename(columns={"date": "ds", "quantity_used": "y"})
    df_prophet = df_prophet[["ds", "y", "rainfall_mm"]].sort_values("ds") 

    # 4. Prophet Model Fit and Forecast
    model = Prophet(yearly_seasonality=True)
    
    # Add the exogenous variable (regressor)
    model.add_regressor('rainfall_mm') 
    
    model.fit(df_prophet)

    # --- Prepare Future DataFrame with Forecasted Regressor ---
    
    # Calculate daily average rainfall pattern (month-day average) for projection
    df_prophet['month_day'] = df_prophet['ds'].dt.strftime('%m-%d')
    # Use mean of rainfall for each day of the year (e.g., mean rainfall on Jan 1st)
    avg_rainfall_pattern = df_prophet.groupby('month_day')['rainfall_mm'].mean().reset_index()
    
    # Create future dataframe
    future = model.make_future_dataframe(periods=horizon_months * 30, freq='D') 
    future['month_day'] = future['ds'].dt.strftime('%m-%d')
    
    # Merge the future dates with the historical average rainfall pattern
    future = pd.merge(future, avg_rainfall_pattern, on='month_day', how='left')
    future.drop(columns=['month_day'], inplace=True)
    
    # Fill any NaNs (should be few if historical data covers a full year) with the overall mean
    future['rainfall_mm'].fillna(future['rainfall_mm'].mean(), inplace=True) 

    # Predict
    forecast = model.predict(future)

    # 5. Extract and finalize forecast (Aggregation)
    # The forecast is currently daily. Aggregate to monthly.
    forecast_out = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(horizon_months * 30)
    
    forecast_out['ds'] = pd.to_datetime(forecast_out['ds'])
    
    # CRITICAL FIX: Sum 'yhat' (the forecast) but use the MEAN of confidence intervals 
    # to avoid falsely expanding the uncertainty bounds.
    monthly_forecast = forecast_out.set_index('ds').resample('M').agg({
        'yhat': 'sum',           # Sum the predicted demand
        'yhat_lower': 'mean',    # Use mean for lower confidence bound
        'yhat_upper': 'mean'     # Use mean for upper confidence bound
    }).reset_index()

    # Finalize output
    monthly_forecast["material"] = material
    monthly_forecast.rename(columns={'ds': 'forecast_date'}, inplace=True)

    out_path = os.path.join(FORECAST_DIR, f"{material}_forecast.csv")
    monthly_forecast.to_csv(out_path, index=False)

    return monthly_forecast