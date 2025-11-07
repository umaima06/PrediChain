# recommendation.py
import pandas as pd

# Default buffer stock settings
DEFAULT_SAFETY_STOCK_PERCENT = 0.10  # Keep 10% of forecasted need as safety stock


def generate_procurement_recommendations(
    forecast_df: pd.DataFrame,
    lead_time_days: int,
    current_inventory: float,
    safety_stock_percent: float = DEFAULT_SAFETY_STOCK_PERCENT,
    current_project_data: pd.DataFrame = None
) -> (pd.DataFrame, pd.DataFrame):
    """
    Generates procurement recommendations by combining forecasted demand (historical trends)
    with current project data (real-time site conditions, suppliers, etc.).

    Returns:
      - final_output (DataFrame): rows with recommended_order_quantity, recommended_order_date, material, forecasted_demand
      - bulk_orders_df (DataFrame): aggregated suggested bulk orders per month (multi-material)
    """

    # ✅ Step 0: Defensive copy
    forecast_df = forecast_df.copy()

    # ✅ Ensure forecast_date is datetime so .dt works
    if 'forecast_date' in forecast_df.columns:
        forecast_df['forecast_date'] = pd.to_datetime(forecast_df['forecast_date'], errors='coerce')
    else:
        # If there's no forecast_date, try ds or create synthetic monthly index
        if 'ds' in forecast_df.columns:
            forecast_df['forecast_date'] = pd.to_datetime(forecast_df['ds'], errors='coerce')
        else:
            # create a default forecast_date (today) to avoid crashes
            forecast_df['forecast_date'] = pd.to_datetime(pd.Timestamp.now())

    # ✅ Step 1: Validate required columns
    required_cols = ['forecast_date', 'yhat', 'material']
    if not all(col in forecast_df.columns for col in required_cols):
        raise ValueError("Forecast DataFrame is missing required columns (forecast_date, yhat, material).")

    # ✅ Step 2: Start recommendation DataFrame
    recommendations = forecast_df.copy()

    # 🔄 Step 3: Merge current project data if provided
    if current_project_data is not None and not current_project_data.empty:
        # ensure forecast_date dtype too
        if 'forecast_date' in current_project_data.columns:
            current_project_data['forecast_date'] = pd.to_datetime(current_project_data['forecast_date'], errors='coerce')
            # merge on forecast_date where possible
            try:
                recommendations = recommendations.merge(
                    current_project_data, on='forecast_date', how='left', suffixes=('', '_proj')
                )
            except Exception:
                # fallback: broadcast
                project_info = current_project_data.iloc[0].to_dict()
                for key, value in project_info.items():
                    if key not in recommendations.columns:
                        recommendations[key] = value
        else:
            # broadcast first row’s values to all rows
            project_info = current_project_data.iloc[0].to_dict()
            for key, value in project_info.items():
                if key not in recommendations.columns:
                    recommendations[key] = value

    # ✅ Step 4: Safety Stock + Total Material Need
    recommendations['yhat'] = pd.to_numeric(recommendations['yhat'], errors='coerce').fillna(0)
    recommendations['safety_stock'] = recommendations['yhat'] * safety_stock_percent
    recommendations['total_need'] = recommendations['yhat'] + recommendations['safety_stock']

    # ✅ Step 5: Adjust for Supplier Reliability (if present)
    # Accept either 'Supplier_Reliability_Score' or 'supplier_reliability' — normalize
    if 'Supplier_Reliability_Score' in recommendations.columns and 'supplier_reliability' not in recommendations.columns:
        recommendations['supplier_reliability'] = recommendations['Supplier_Reliability_Score']

    if 'supplier_reliability' in recommendations.columns:
        reliability = recommendations['supplier_reliability'].fillna(100) / 100.0
        reliability = reliability.clip(lower=0.1)  # prevent div/0
        recommendations['total_need'] = (recommendations['total_need'] / reliability).round().astype(float)

    # ✅ Step 6: Calculate Recommended Order Quantity
    # If current_inventory is per-material this should come from merged project data; else treat as global
    # For per-row logic, we'll use a broadcasted current_inventory if provided as scalar.
    recommendations['recommended_order_quantity'] = (
        recommendations['total_need'] - float(current_inventory)
    ).apply(lambda x: max(0, x)).round().astype(int)

    # Reset (conceptual) inventory after first use
    # NOTE: we intentionally do **not** mutate the passed in current_inventory here, backend handles per-material stock if provided.
    # current_inventory = 0

    # ✅ Step 7: Determine Order Dates
    lead_time = pd.Timedelta(days=int(lead_time_days))
    # need_date: month start (the month when demand occurs)
    recommendations['need_date'] = recommendations['forecast_date'].dt.to_period('M').dt.start_time
    recommendations['recommended_order_date'] = recommendations['need_date'] - lead_time

    # Ensure recommended_order_date is a datetime column
    recommendations['recommended_order_date'] = pd.to_datetime(recommendations['recommended_order_date'], errors='coerce')

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
    final_output = final_output[final_output['recommended_order_quantity'] > 0].copy()
    final_output.reset_index(drop=True, inplace=True)

    # --- NEW: Multi-material bulk suggestion (aggregate by order month across materials)
    bulk_orders_df = pd.DataFrame()
    try:
        if current_project_data is not None and 'material' in current_project_data.columns and not final_output.empty:
            # group by the order month and sum recommended quantities
            bulk = (
                final_output
                .assign(order_month=final_output['recommended_order_date'].dt.to_period('M').astype(str))
                .groupby('order_month', sort=True)['recommended_order_quantity']
                .sum()
                .reset_index()
                .rename(columns={'recommended_order_quantity': 'bulk_order_quantity'})
            )
            bulk_orders_df = bulk
    except Exception:
        bulk_orders_df = pd.DataFrame()

    # 🧾 Debug Info
    print("✅ Final recommendation columns:", final_output.columns.tolist())
    print("✅ Final recommendation shape:", final_output.shape)
    if not bulk_orders_df.empty:
        print("✅ Bulk orders shape:", bulk_orders_df.shape)

    # Return both DataFrames (frontend/backend will convert to JSON lists)
    return final_output, bulk_orders_df