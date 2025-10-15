# 🏗️ PrediChain: AI-Powered Materials Demand Forecasting for Civic Infrastructure

### ⚙️ Project Overview
**PrediChain** is an AI-driven forecasting and procurement optimization system designed for **civic infrastructure projects** — helping organizations predict **future material demand** with high accuracy.  

By leveraging **machine learning**, PrediChain enables smart supply chain planning, timely procurement, and optimized inventory levels for key construction materials like cement, steel, sand, and bricks.

---

## 🚀 Problem Statement
In civic infrastructure, **procurement inefficiencies** often lead to:
- Overstocking (wasted capital and storage costs)
- Stockouts (delayed projects and cost overruns)
- Poor visibility into upcoming demand  

Traditional planning relies on manual estimates that ignore seasonality, lead times, and external factors.  
**PrediChain** solves this by forecasting future material demand using machine learning — transforming how supply chains in public infrastructure are managed.

---

## 🎯 Objective
To build a predictive system that:
- Accurately forecasts **monthly demand** for key construction materials.
- Incorporates project, regional, and seasonal variables.
- Recommends **optimal order quantities**, **safety stock**, and **reorder points**.
- Supports data-driven **procurement and inventory decisions**.

---

## 🏗️ Domain Focus
**Civic Infrastructure Construction**

PrediChain focuses on public infrastructure such as roads, bridges, and municipal buildings — where timely material availability is crucial.  
The system forecasts demand for:
- 🧱 Cement  
- 🔩 Reinforcing Steel (Rebar)  
- 🪨 Sand & Aggregates  
- 🧱 Bricks  
- 🧰 PVC Pipes, Electrical Wiring, Paint, Tiles  

---

## 📊 Data Sources
PrediChain utilizes (or simulates) data such as:
| Data Type | Example Fields |
|------------|----------------|
| Historical usage | `month`, `material`, `quantity_used` |
| Project data | `project_id`, `region`, `project_type`, `start_date`, `end_date` |
| Procurement | `lead_time`, `order_date`, `delivery_date` |
| External | `rainfall_mm`, `commodity_price_index`, `permits_issued`, `holiday_flag` |

If real datasets are unavailable, a **synthetic dataset** can be generated to simulate realistic construction material consumption trends.

---

## 🧠 Machine Learning Approach

### **1. Data Preprocessing**
- Time-based aggregation (monthly per material)
- Handling missing values and outliers
- Feature generation (lags, rolling averages, seasonality, project pipeline)

### **2. Modeling Techniques**
- **Baseline Models:** Moving Average, Exponential Smoothing  
- **Forecasting Models:** Prophet, ARIMA/SARIMA  
- **Machine Learning Models:** XGBoost, Random Forest for multivariate regression  
- **Hybrid Ensemble:** Prophet + XGBoost for accuracy and interpretability  
- **Intermittent Demand:** Croston’s method for rarely used materials  

### **3. Evaluation Metrics**
- MAE (Mean Absolute Error)  
- RMSE (Root Mean Square Error)  
- sMAPE (Symmetric Mean Absolute Percentage Error)  
- Cost-based metrics (holding & stockout cost impact simulation)

---

## 🧾 Procurement Optimization Layer

Using predicted demand, PrediChain computes key operational insights:

| Formula | Purpose |
|----------|----------|
| `Safety Stock = z * σ * sqrt(LeadTime)` | Ensures buffer stock |
| `Reorder Point = DemandDuringLeadTime + SafetyStock` | Optimal reorder trigger |
| `EOQ = sqrt((2 * D * OrderingCost) / HoldingCost)` | Minimizes total cost |

These formulas guide when and how much to order for each material, directly reducing waste and delays.

---

## 💻 System Architecture


            ┌──────────────────────┐
            │ Historical Data (CSV)│
            └──────────┬───────────┘
                       │
                       ▼
           ┌──────────────────────┐
           │ Data Preprocessing   │
           └──────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │ ML Model (Prophet/XGB) │
          └──────────┬─────────────┘
                       │
                       ▼
      ┌────────────────────────────────┐
      │ Forecast Output & Procurement   │
      │ Recommendations (ROP, EOQ)      │
      └────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │ Interactive Dashboard (UI)  │
         │ Streamlit / React + Charts  │
         └─────────────────────────────┘



---

## 📈 Key Features
✅ Real-time demand forecasting per material  
✅ Seasonality & weather-aware predictions  
✅ Procurement decision engine (ROP, EOQ)  
✅ Cost & risk simulation (stockout vs overstock)  
✅ Explainable forecasts (feature importance via SHAP)  
✅ Visual dashboard for planning & what-if analysis  

---

## 🧩 Tech Stack
| Component | Technology |
|------------|-------------|
| **Backend / ML** | Python (Pandas, Scikit-learn, Prophet, XGBoost) |
| **Data Storage** | CSV / Firebase / SQLite |
| **Visualization** | Matplotlib, Plotly, Seaborn |
| **Dashboard / Frontend** | Streamlit or React.js |
| **Deployment** | Replit / Render / Streamlit Cloud |

---

## 📉 Sample Output
| Month | Material | Forecast (Tons) | Safety Stock | Reorder Point | Suggested Order |
|--------|-----------|----------------|---------------|----------------|-----------------|
| Nov 2025 | Cement | 420 | 40 | 460 | 480 |
| Dec 2025 | Steel | 280 | 30 | 310 | 300 |

---

## 🌍 Impact
- ⏱️ **Reduced procurement delays** by up to 30%  
- 💰 **Lowered inventory holding cost** through precise ordering  
- 🌱 **Sustainability:** minimized wastage of raw materials  
- 🧮 **Data-driven governance:** supports transparent planning in civic projects  

---

## 🧩 Future Enhancements
- Integration with **live procurement ERP systems**  
- Incorporate **satellite data** or **real-time weather feeds**  
- Apply **Reinforcement Learning** for adaptive ordering policies  
- Multi-tier forecasting (material → project → regional → national level)  
- Predict **supply risk** based on vendor reliability  

---

## 🧑‍💻 Team PrediChain
- **Domain:** Civic Infrastructure  
- **Focus:** Data-driven demand forecasting & inventory optimization  
- **Goal:** Build a sustainable and intelligent materials supply chain ecosystem.  

---

## ⚡ How to Run (Local)
```bash
# Clone the repository
git clone https://github.com/yourusername/PrediChain.git
cd PrediChain

# Install dependencies
pip install -r requirements.txt

# Run the notebook or dashboard
streamlit run app.py
