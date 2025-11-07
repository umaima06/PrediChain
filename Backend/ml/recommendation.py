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
    """

    # ✅ Step 1: Validate required columns
    required_cols = ['forecast_date', 'yhat', 'material']
    if not all(col in forecast_df.columns for col in required_cols):
        raise ValueError("Forecast DataFrame is missing required columns (forecast_date, yhat, material).")

    # ✅ Step 2: Start recommendation DataFrame
    recommendations = forecast_df.copy()

    # 🟢 CRITICAL FIX A: Ensure 'forecast_date' is a proper datetime object
    recommendations['forecast_date'] = pd.to_datetime(recommendations['forecast_date'], errors='coerce')
    
    # 🔴 CRITICAL FIX B: Prevent Negative Forecasts
    recommendations['yhat'] = recommendations['yhat'].clip(lower=0) 

    # 🔄 Step 3: Merge current project data if provided
    if current_project_data is not None and not current_project_data.empty:
        # Convert date column in project data for merging, if it exists
        if 'forecast_date' in current_project_data.columns:
            current_project_data['forecast_date'] = pd.to_datetime(current_project_data['forecast_date'], errors='coerce')
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

    # 🟢 Step 5: Supplier Reliability Logic (Now with complete column normalization)
    recommendations['material'] = recommendations['material'].str.strip().str.lower()
    
    if current_project_data is not None and not current_project_data.empty:
        # 🟢 CRITICAL FIX D: Normalize ALL column names for reliable lookup 
        # This ensures column matching works, even with hidden spaces.
        current_project_data.columns = current_project_data.columns.str.strip().str.lower()

        # Normalize material names
        current_project_data['material'] = current_project_data['material'].astype(str).str.strip().str.lower()

        # Handle different column names (now all lowercased to match the normalized columns)
        possible_cols = ['supplier_reliability_score', 'supplierreliability', 'supplier_reliability'] 
        found_col = next((c for c in possible_cols if c in current_project_data.columns), None)

        if found_col:
            # Convert to string and strip %
            current_project_data[found_col] = (
                current_project_data[found_col]
                .astype(str).str.replace('%','').str.strip()
            )

            # CRITICAL FIX C: Use pd.to_numeric for error handling
            current_project_data[found_col] = pd.to_numeric(
                current_project_data[found_col], 
                errors='coerce'
            )
            
            # 🧩 FIX: Combine CSV history average with current project reliability input
            # # --- 1️⃣ Historical Average from the uploaded Excel file
            historical_avg = (
                 current_project_data.groupby('material')[found_col]
                 .mean()
                 .fillna(100)
                 .clip(0, 100)
                 .to_dict()
                 )
            
            # --- 2️⃣ Current project reliability input (from upload form)
            # # Check if the user entered supplier reliability for this run
            if 'supplierreliability' in current_project_data.columns:
              current_inputs = (
                   current_project_data.groupby('material')['supplierreliability']
                   .mean().fillna(100)
                   .clip(0, 100)
                   .to_dict()
                   )
            else:
                current_inputs = {}

            # --- 3️⃣ Combine historical and current
            combined_reliability = {}
            for mat in set(historical_avg.keys()).union(current_inputs.keys()):
                hist = historical_avg.get(mat, 100)
                curr = current_inputs.get(mat, hist)  # if current not found, fallback to historical
                combined_reliability[mat] = (hist + curr) / 2

            # --- 4️⃣ Map the combined average to recommendations
            recommendations['Supplier_Reliability_Score'] = (
                recommendations['material'].map(combined_reliability)
                .fillna(100)
            )
            
            print("📊 Historical reliability:", historical_avg)
            print("📈 Current input reliability:", current_inputs)
            print("🧮 Combined reliability map:", combined_reliability)

            
            # Map the aggregated average reliability score back to the recommendations
            recommendations['Supplier_Reliability_Score'] = (
                recommendations['material'].map(combined_reliability)
                .fillna(100) # Fallback again for materials that didn't map
            )
        else:
            recommendations['Supplier_Reliability_Score'] = 100
    else:
        recommendations['Supplier_Reliability_Score'] = 100

    # ✅ Step 6: Calculate Recommended Order Quantity
    recommendations['recommended_order_quantity'] = (
        recommendations['total_need'] - current_inventory
    ).apply(lambda x: max(0, x)).round().astype(int)

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
         'recommended_order_date', 'yhat', 'Supplier_Reliability_Score'] + optional_cols
         ].rename(columns={
             'yhat': 'forecasted_demand',
             'Supplier_Reliability_Score': 'supplier_reliability'
             })

    # Only show months with positive order quantity
    final_output = final_output[final_output['recommended_order_quantity'] > 0]

    # 🧾 Debug Info
    print("✅ Final recommendation columns:", final_output.columns.tolist())
    print("✅ Final recommendation shape:", final_output.shape)

    return final_output
