import pandas as pd

# Assume a starting inventory level and safety stock policy
# In a real system, these would be user inputs or database lookups.
# For now, use sensible default values for testing.
DEFAULT_SAFETY_STOCK_PERCENT = 0.10  # Keep 10% of forecasted need as safety stock

def generate_procurement_recommendations(
    forecast_df: pd.DataFrame, 
    lead_time_days: int, 
    current_inventory: float,
    safety_stock_percent: float = DEFAULT_SAFETY_STOCK_PERCENT
) -> pd.DataFrame:
    """
    Generates optimal order timing and quantity based on the monthly forecast.

    Args:
        forecast_df: The monthly forecast DataFrame from generate_forecast.
        lead_time_days: The number of days the supplier takes to deliver the material.
        current_inventory: The amount of material currently in stock.
        safety_stock_percent: Percentage of forecasted demand to hold as buffer.

    Returns:
        A DataFrame with recommended order timing and quantity.
    """
    
    # Ensure the required columns are present
    required_cols = ['forecast_date', 'yhat', 'material']
    if not all(col in forecast_df.columns for col in required_cols):
        raise ValueError("Forecast DataFrame is missing required columns (forecast_date, yhat, material).")

    recommendations = forecast_df.copy()
    
    # 1. Calculate Safety Stock and Total Need
    recommendations['safety_stock'] = recommendations['yhat'] * safety_stock_percent
    recommendations['total_need'] = recommendations['yhat'] + recommendations['safety_stock']

    # 2. Calculate Order Quantity
    # Order Quantity = Total Need - Current Inventory (Order only if needed)
    # Use max(0, ...) to ensure we don't recommend a negative order (i.e., we don't need to order)
    recommendations['recommended_order_quantity'] = (recommendations['total_need'] - current_inventory).apply(lambda x: max(0, x)).round().astype(int)
    
    # Reset inventory for the next month's calculation.
    # We assume inventory is used up during the month.
    # Note: For simplicity, we only consider the *first* month's inventory impact here.
    current_inventory = 0 # Assume inventory is depleted after the first forecasted month.

    # 3. Calculate Order Timing
    # Material is typically needed at the start of the forecasted month (e.g., Oct 1st for October's demand).
    # Order Date = Need Date - Lead Time
    
    # Convert lead_time_days to a timedelta object
    lead_time = pd.Timedelta(days=lead_time_days)
    
    # The 'Need Date' is the 1st day of the forecast month
    recommendations['need_date'] = recommendations['forecast_date'].dt.to_period('M').dt.start_time
    
    recommendations['recommended_order_date'] = recommendations['need_date'] - lead_time
    
    # 4. Final Output Formatting
    final_output = recommendations[
        ['material', 'forecast_date', 'recommended_order_quantity', 'recommended_order_date', 'yhat']
    ].rename(columns={'yhat': 'forecasted_demand'})
    
    # Filter out recommendations where the order quantity is zero
    return final_output[final_output['recommended_order_quantity'] > 0]