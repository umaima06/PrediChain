import pandas as pd

# Default buffer stock settings
DEFAULT_SAFETY_STOCK_PERCENT = 0.10  # Keep 10% of forecasted need as safety stock


def generate_procurement_recommendations(
    forecast_df: pd.DataFrame, 
    lead_time_days: int, 
    current_inventory: float,
    safety_stock_percent: float = DEFAULT_SAFETY_STOCK_PERCENT,
    current_project_data: pd.DataFrame = None
) -> pd.DataFrame:
    """
    Generates procurement recommendations by combining forecasted demand (historical trends)
    with current project data (real-time site conditions, suppliers, etc.).

    Args:
        forecast_df: DataFrame from forecast.py containing forecast_date, yhat, and material.
        lead_time_days: Supplier lead time in days.
        current_inventory: Material currently in stock.
        safety_stock_percent: Buffer percentage of forecasted demand.
        current_project_data: DataFrame with current project details (optional).

    Returns:
        DataFrame containing recommended order quantity, order date, and demand insights.
    """

    # ✅ Step 1: Validate required columns
    required_cols = ['forecast_date', 'yhat', 'material']
    if not all(col in forecast_df.columns for col in required_cols):
        raise ValueError("Forecast DataFrame is missing required columns (forecast_date, yhat, material).")

    # ✅ Step 2: Start recommendation DataFrame
    recommendations = forecast_df.copy()

    # 🔄 Step 3: Merge current project data if provided
    if current_project_data is not None and not current_project_data.empty:
        if 'forecast_date' in current_project_data.columns:
            # Merge by forecast_date if available
            recommendations = recommendations.merge(
                current_project_data, on='forecast_date', how='left', suffixes=('', '_proj')
            )
        else:
            # Otherwise, broadcast first row’s values to all rows
            project_info = current_project_data.iloc[0].to_dict()
            for key, value in project_info.items():
                recommendations[key] = value

    # ✅ Step 4: Safety Stock + Total Material Need
    recommendations['safety_stock'] = recommendations['yhat'] * safety_stock_percent
    recommendations['total_need'] = recommendations['yhat'] + recommendations['safety_stock']

    # ✅ Step 5: Adjust for Supplier Reliability (if present)
    if 'Supplier_Reliability_Score' in recommendations.columns:
        reliability = recommendations['Supplier_Reliability_Score'].fillna(100) / 100
        reliability = reliability.clip(lower=0.1)  # prevent div/0
        recommendations['total_need'] = recommendations['total_need'] / reliability

    # ✅ Step 6: Calculate Recommended Order Quantity
    recommendations['recommended_order_quantity'] = (
        recommendations['total_need'] - current_inventory
    ).apply(lambda x: max(0, x)).round().astype(int)

    # Reset inventory after first use
    current_inventory = 0

    # ✅ Step 7: Determine Order Dates
    lead_time = pd.Timedelta(days=lead_time_days)
    recommendations['need_date'] = recommendations['forecast_date'].dt.to_period('M').dt.start_time
    recommendations['recommended_order_date'] = recommendations['need_date'] - lead_time

    # ✅ Step 8: Add optional fields if missing
    optional_cols = [
        'Average_Delivery_Time_Days', 'Delivery_Delays', 'Contractor_Team_Size',
        'Number_of_Shifts_Work_Hours', 'Planned_Quantity', 'Project_Phase',
        'Notes_Special_Conditions', 'Budget_Planned_Quantity', 'Weather_Condition',
        'Regional_Risk_Level'
    ]
    for col in optional_cols:
        if col not in recommendations.columns:
            recommendations[col] = None

    # ✅ Step 9: Final Output Formatting
    final_output = recommendations[
        ['material', 'forecast_date', 'recommended_order_quantity', 
         'recommended_order_date', 'yhat'] + optional_cols
    ].rename(columns={'yhat': 'forecasted_demand'})

    # Only show months with positive order quantity
    final_output = final_output[final_output['recommended_order_quantity'] > 0]

    # 🧾 Debug Info
    print("✅ Final recommendation columns:", final_output.columns.tolist())
    print("✅ Final recommendation shape:", final_output.shape)

    return final_output