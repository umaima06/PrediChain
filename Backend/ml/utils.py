# helper functions (cleaning, validation)
# ml/utils.py

import pandas as pd
from typing import List

def clean_and_validate_data(df: pd.DataFrame, required_cols: List[str]) -> pd.DataFrame:
    """
    Cleans, validates, and prepares the input DataFrame for ML forecasting.
    This function performs column checks, type conversions, handles anomalies, 
    and aggregates daily material usage.
    
    Args:
        df: The raw input DataFrame from the uploaded CSV.
        required_cols: A list of mandatory columns (e.g., ['date', 'material', 'quantity_used', 'rainfall_mm']).
    
    Returns:
        A cleaned, validated, and aggregated DataFrame ready for Prophet.
    
    Raises:
        ValueError: If essential columns are missing or date conversion fails.
    """
    
    # CRITICAL FIX 1: Strip all column names to remove any hidden whitespace or BOM characters.
    df.columns = df.columns.str.strip()

    # 1. Check for required columns
    if not set(required_cols).issubset(df.columns):
        missing = set(required_cols) - set(df.columns)
        # Check if 'date' is still missing after stripping (e.g., due to file corruption)
        if 'date' not in df.columns:
             raise ValueError("The 'date' column must be present and named exactly 'date'.")
        raise ValueError(f"Missing required columns: {missing}. Must include: {required_cols}")

    # 2. Convert date column (ds)
    try:
        # CRITICAL FIX 2: Use errors='coerce' to turn any unparseable dates into NaT (Not a Time), 
        # allowing the script to continue without raising a fatal conversion error.
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
    except Exception:
        # This catches residual errors if the column cannot be accessed.
        raise ValueError("The 'date' column must be present and in a recognizable date format.")

    # Drop any rows where the date conversion failed (now represented as NaT)
    df.dropna(subset=['date'], inplace=True)
    
    # 3. Clean and validate 'quantity_used' (y) and 'rainfall_mm' (exogenous variable)
    
    # Ensure quantity_used is numeric, coercing errors to NaN
    df['quantity_used'] = pd.to_numeric(df['quantity_used'], errors='coerce')
    
    # Handle negative or zero usage/quantity, which might be errors in project logs
    df.dropna(subset=['quantity_used'], inplace=True)
    df = df[df['quantity_used'] >= 0]
    
    # Ensure rainfall_mm is numeric (important for the regressor)
    df['rainfall_mm'] = pd.to_numeric(df['rainfall_mm'], errors='coerce')
    # Fill any missing rainfall data with 0
    df['rainfall_mm'].fillna(0, inplace=True) 

    # 4. Aggregate data to a daily frequency
    
    # Set 'date' as index for easier grouping
    df = df.set_index('date')
    
    # Group by material and resample to daily frequency ('D')
    aggregated_df = df.groupby(['material', pd.Grouper(freq='D')]).agg({
        'quantity_used': 'sum',
        'rainfall_mm': 'mean' 
    }).reset_index()

    # Rename column back to 'date'
    aggregated_df.rename(columns={'date': 'date'}, inplace=True)
    
    # Backfill missing usage after aggregation with 0
    aggregated_df['quantity_used'].fillna(0, inplace=True)
    
    # Forward-fill the rainfall_mm 
    aggregated_df['rainfall_mm'].fillna(method='ffill', inplace=True)
    
    return aggregated_df
