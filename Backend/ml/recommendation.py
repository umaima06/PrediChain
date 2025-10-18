import pandas as pd

# Assume a starting inventory level and safety stock policy
# In a real system, these would be user inputs or database lookups.
# For now, use sensible default values for testing.
DEFAULT_SAFETY_STOCK_PERCENT = 0.10  # Keep 10% of forecasted need as safety stock

def generate_procurement_recommendations(
    forecast_df: pd.DataFrame, 
    lead_time_days: int, 
    current_inventory: float,
    safety_stock_percent: float = DEFAULT_SAFETY_STOCK_PERCENT,
    extra_info: pd.DataFrame = None
) -> pd.DataFrame:
    """
    Generates procurement recommendations using current project data + forecast.
    Combines forecasted demand with optional extra project info for detailed recommendations.

    Args:
        forecast_df: Monthly forecast DataFrame from historical data.
        lead_time_days: Supplier lead time in days.
        current_inventory: Material currently in stock.
        safety_stock_percent: Buffer percentage of forecasted demand.
        extra_info: Optional DataFrame with extra project details (supplier, project size, weather, etc.)

    Returns:
        DataFrame containing recommended order quantity, order date, forecasted demand,
        and optional project-specific fields. Only months with orders > 0 are returned.
    """

    # Ensure the forecast dataframe has the required columns
    required_cols = ['forecast_date', 'yhat', 'material']
    if not all(col in forecast_df.columns for col in required_cols):
        raise ValueError("Forecast DataFrame is missing required columns (forecast_date, yhat, material).")

    # Copy the forecast to start building recommendations
    recommendations = forecast_df.copy()

    # Merge extra info from current project (if provided)
    if extra_info is not None:
        # Only use the first row of project-level data, broadcast to all forecast months
        extra_row = extra_info.iloc[0].to_dict()
        for key, value in extra_row.items():
            recommendations[key] = value

    # 1. Calculate Safety Stock and Total Material Need
    # Safety stock = forecasted demand * buffer %
    recommendations['safety_stock'] = recommendations['yhat'] * safety_stock_percent
    recommendations['total_need'] = recommendations['yhat'] + recommendations['safety_stock']

    # 2. Adjust for Supplier Reliability (if present)
    if 'Supplier_Reliability_Score' in recommendations.columns:
        # Convert % to fraction
        reliability = recommendations['Supplier_Reliability_Score'].fillna(1.0)/100
        # Avoid division by zero
        recommendations['total_need'] = recommendations['total_need'] / reliability.clip(lower=0.1)

    # 3. Calculate Recommended Order Quantity
    # Order Quantity = Total Need - Current Inventory (use max(0, ...) to avoid negative orders)
    recommendations['recommended_order_quantity'] = (
        recommendations['total_need'] - current_inventory
    ).apply(lambda x: max(0, x)).round().astype(int)

    # Reset inventory for the next month's calculation
    # Assume inventory is depleted after first forecast month
    current_inventory = 0

    # 4. Calculate Order Timing
    # Material is typically needed at the start of the forecast month
    lead_time = pd.Timedelta(days=lead_time_days)
    recommendations['need_date'] = recommendations['forecast_date'].dt.to_period('M').dt.start_time
    recommendations['recommended_order_date'] = recommendations['need_date'] - lead_time

    # 5. Include optional fields from project / historical info
    optional_cols = [
        'Average_Delivery_Time_Days', 'Delivery_Delays', 'Contractor_Team_Size',
        'Number_of_Shifts_Work_Hours', 'Planned_Quantity', 'Project_Phase',
        'Notes_Special_Conditions', 'Budget_Planned_Quantity', 'Weather_Condition',
        'Regional_Risk_Level'
    ]
    for col in optional_cols:
        if col not in recommendations.columns:
            recommendations[col] = None  # fill missing optional fields

    # 6. Final Output Formatting
    final_output = recommendations[
        ['material', 'forecast_date', 'recommended_order_quantity', 'recommended_order_date', 'yhat'] + optional_cols
    ].rename(columns={'yhat': 'forecasted_demand'})

    # Only return months where an order is needed
    return final_output[final_output['recommended_order_quantity'] > 0]