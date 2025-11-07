# backend/ml/recovery_model_train.py
import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OneHotEncoder
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

np.random.seed(42)

phases = ["foundation", "slabbing", "curing", "painting", "roofing", "plumbing"]
structures = ["building", "bridge", "road", "dam", "warehouse"]
risk_levels = ["Low", "Medium", "High"]

data = {
    "phase": np.random.choice(phases, 1000),
    "structure": np.random.choice(structures, 1000),
    "temperature": np.random.uniform(15, 45, 1000),
    "rain": np.random.uniform(0, 60, 1000),
    "humidity": np.random.uniform(30, 100, 1000),
    "wind": np.random.uniform(0, 70, 1000),
    "risk_level": np.random.choice(risk_levels, 1000)
}

df = pd.DataFrame(data)

# Smart adaptive action patterns
actions = []
for _, row in df.iterrows():
    if row["risk_level"] == "High" and row["rain"] > 25:
        actions.append("Postpone critical works and secure exposed structures")
    elif row["risk_level"] == "Medium" and row["humidity"] > 75:
        actions.append("Ensure drying conditions and monitor material exposure")
    else:
        actions.append("Continue with normal workflow but observe weather trends")
df["action"] = actions

# Encode + train
enc = OneHotEncoder(handle_unknown="ignore")
X = df[["phase", "structure", "risk_level", "temperature", "rain", "humidity", "wind"]]
y = df["action"]

model = Pipeline([
    ("encoder", enc),
    ("clf", RandomForestClassifier(n_estimators=100, random_state=42))
])

Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
model.fit(Xtr, ytr)
acc = model.score(Xte, yte)
print(f"🎯 Adaptive Recovery Model Accuracy: {acc*100:.2f}%")

os.makedirs("ml/models", exist_ok=True)
joblib.dump(model, "ml/models/recovery_advisor_v3.joblib")
print("✅ Saved model: ml/models/recovery_advisor_v3.joblib")
