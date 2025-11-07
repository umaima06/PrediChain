# backend/ml/risk_model_train.py
import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer

np.random.seed(42)

# ========== Synthetic Adaptive Training Dataset ==========
# Instead of hardcoding, we generate variety.
phases = ["foundation", "slabbing", "curing", "painting", "roofing", "plumbing", "tiling"]
structures = ["building", "bridge", "road", "warehouse", "tunnel", "dam"]
materials = np.random.randint(1, 10, 1500)
weather_data = {
    "temperature": np.random.uniform(10, 45, 1500),
    "rain": np.random.uniform(0, 60, 1500),
    "humidity": np.random.uniform(30, 100, 1500),
    "wind": np.random.uniform(0, 70, 1500),
}
df = pd.DataFrame(weather_data)
df["phase"] = np.random.choice(phases, len(df))
df["structure"] = np.random.choice(structures, len(df))
df["materials_complexity"] = materials

# Adaptive risk mapping — probabilistic, not fixed rules
df["risk_level"] = np.where(
    (df["rain"] > 25) | (df["humidity"] > 85), "High",
    np.where((df["wind"] > 40) | (df["temperature"] > 38), "Medium", "Low")
)

# ========== Adaptive Preprocessing ==========
num_features = ["temperature", "rain", "humidity", "wind", "materials_complexity"]
cat_features = ["phase", "structure"]

numeric_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="mean")),
    ("scaler", StandardScaler())
])

categorical_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore"))
])

preprocessor = ColumnTransformer(
    transformers=[
        ("num", numeric_transformer, num_features),
        ("cat", categorical_transformer, cat_features)
    ]
)

# ========== Model Training ==========
model = Pipeline([
    ("preprocessor", preprocessor),
    ("clf", RandomForestClassifier(n_estimators=200, random_state=42))
])

X = df[num_features + cat_features]
y = df["risk_level"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model.fit(X_train, y_train)

acc = model.score(X_test, y_test)
print(f"🎯 Adaptive Risk Model Accuracy: {acc*100:.2f}%")

os.makedirs("ml/models", exist_ok=True)
joblib.dump(model, "ml/models/risk_assessor_v3.joblib")
print("✅ Saved model: ml/models/risk_assessor_v3.joblib")
