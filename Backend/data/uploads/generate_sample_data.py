import pandas as pd
import numpy as np
from datetime import date, timedelta

def generate_realistic_data(start_date: str, end_date: str, materials: list, seasonality_factor: float = 0.3):
    """
    Generates a realistic time series dataset for material demand.
    Incorporates trend, weekly/yearly seasonality, and a weather factor.
    """
    start = pd.to_datetime(start_date)
    end = pd.to_datetime(end_date)
    date_range = pd.date_range(start=start, end=end, freq='D')
    
    all_data = []

    for material in materials:
        # Base demand and trend (simulating project growth over time)
        if material == 'Cement':
            base_demand = 800
            trend_slope = 1.2
            noise_level = 50
        elif material == 'Steel Rebar':
            base_demand = 500
            trend_slope = 0.8
            noise_level = 30
        else: # e.g., 'Gravel'
            base_demand = 1200
            trend_slope = 1.0
            noise_level = 70
        
        # Simulate data for the current material
        df = pd.DataFrame({'date': date_range})
        df['material'] = material
        
        # 1. Linear Trend: Demand slowly increases over time
        df['days'] = (df['date'] - start).dt.days
        trend = df['days'] * trend_slope
        
        # 2. Yearly Seasonality: Lower demand in winter/rainy months (e.g., Oct-Feb)
        # We use a sine wave to simulate this cycle
        yearly_cycle = np.sin(2 * np.pi * (df['days'] / 365))
        seasonal_effect = yearly_cycle * base_demand * seasonality_factor

        # 3. Weekly Seasonality: Lower demand on weekends (Saturday=5, Sunday=6)
        weekend_effect = df['date'].dt.weekday.apply(lambda x: 0.5 if x >= 5 else 1.0)
        
        # 4. Random Noise (to simulate real-world variability)
        noise = np.random.normal(0, noise_level, size=len(df))
        
        # 5. External Factor (Rainfall): Simulating low demand during heavy rain
        # Assume a rainy season between Oct and Dec
        df['is_rainy_season'] = df['date'].dt.month.isin([10, 11, 12])
        # Rainfall_mm: Higher values during the rainy season, some random values otherwise
        df['rainfall_mm'] = np.where(df['is_rainy_season'], 
                                     np.random.uniform(50, 150, size=len(df)), 
                                     np.random.uniform(0, 10, size=len(df)))
        
        # 6. Final Quantity Used
        # Quantity = (Base + Trend + Seasonality) * Weekend_Effect - Rainfall_Penalty + Noise
        rainfall_penalty = df['rainfall_mm'] * 3 # High rainfall reduces daily usage
        
        df['quantity_used'] = (base_demand + trend + seasonal_effect) * weekend_effect - rainfall_penalty + noise
        
        # Ensure quantities are non-negative and round to integers
        df['quantity_used'] = np.maximum(0, df['quantity_used']).round().astype(int)
        
        all_data.append(df.drop(columns=['days', 'is_rainy_season']))

    final_df = pd.concat(all_data, ignore_index=True)
    
    # 7. Introduce Realism: Set 10% of random days to 0 usage (Simulated project breaks or gaps)
    random_indices = final_df.sample(frac=0.1).index
    final_df.loc[random_indices, 'quantity_used'] = 0
    
    # 8. Introduce Messiness: Add a few rows with bad data (e.g., negative or missing)
    messy_rows = pd.DataFrame({
        'date': ['2024-05-01', '2024-05-02'],
        'material': ['Cement', 'Steel Rebar'],
        'quantity_used': [-100, np.nan],
        'rainfall_mm': [0, 5]
    })
    final_df = pd.concat([final_df, messy_rows], ignore_index=True)
    
    # Finalize columns order
    final_df = final_df[['date', 'material', 'quantity_used', 'rainfall_mm']]
    
    return final_df

# --- EXECUTION ---
START_DATE = '2023-01-01'
END_DATE = '2024-12-31'
MATERIALS = ['Cement', 'Steel Rebar', 'Gravel']

sample_df = generate_realistic_data(START_DATE, END_DATE, MATERIALS)

# Save the file to the required upload directory
OUTPUT_PATH = 'data/uploads/realistic_project_data.csv'
# Create the directory if it doesn't exist
import os
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True) 

sample_df.to_csv(OUTPUT_PATH, index=False)
print(f"Successfully generated realistic data to: {OUTPUT_PATH}")
print("\nFirst 5 rows of the generated data:")
print(sample_df.head())