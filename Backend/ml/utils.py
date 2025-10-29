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
        required_cols: A list of mandatory columns (e.g., ['Date_of_Materail_Usage', 'Material_Name', 'Quantity_Used']).

    Returns:
        A cleaned, validated, and aggregated DataFrame ready for Prophet.

    Raises:
        ValueError: If essential columns are missing or date conversion fails.
    """

    # Strip hidden whitespaces/BOMs
    df.columns = df.columns.str.strip()

    # ✅ Detect the correct date column
    possible_date_cols = ['Date_of_Materail_Usage', 'Date_of_Material_Usage', 'date']
    date_col = next((col for col in possible_date_cols if col in df.columns), None)

    if not date_col:
        raise ValueError("No valid date column found. Expected one of: 'Date_of_Materail_Usage', 'Date_of_Material_Usage', or 'date'.")

    # 1️⃣ Check for required columns
    if not set(required_cols).issubset(df.columns):
        missing = set(required_cols) - set(df.columns)
        raise ValueError(f"Missing required columns: {missing}. Must include: {required_cols}")

    # 2️⃣ Convert date column
    try:
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    except Exception:
        raise ValueError(f"The '{date_col}' column must be in a recognizable date format.")

    df.dropna(subset=[date_col], inplace=True)

    # 3️⃣ Clean Quantity_Used
    df['Quantity_Used'] = pd.to_numeric(df['Quantity_Used'], errors='coerce')
    df.dropna(subset=['Quantity_Used'], inplace=True)
    df = df[df['Quantity_Used'] >= 0]

    # 4️⃣ Handle rainfall_mm (optional)
    if 'rainfall_mm' not in df.columns:
        df['rainfall_mm'] = 0
    else:
        df['rainfall_mm'] = pd.to_numeric(df['rainfall_mm'], errors='coerce').fillna(0)

    # Normalize Material_Name so casing/spaces never break matching
    if "Material_Name" in df.columns:
        df["Material_Name"] = df["Material_Name"].astype(str).str.strip().str.lower()

    # 5️⃣ Aggregate to daily data
    df = df.set_index(date_col)
    aggregated_df = df.groupby(['Material_Name', pd.Grouper(freq='D')]).agg({
        'Quantity_Used': 'sum',
        'rainfall_mm': 'mean'
    }).reset_index()

    # Fill NaNs
    aggregated_df['Quantity_Used'].fillna(0, inplace=True)
    aggregated_df['rainfall_mm'].fillna(method='ffill', inplace=True)

    # Rename date col back for Prophet usage
    aggregated_df.rename(columns={date_col: 'date'}, inplace=True)

    return aggregated_df