import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { db, auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import MetricCard from "../components/MetricCard";
import MaterialForecastChart from "../components/MaterialForecastChart";
import RecommendationPanel from "../components/RecommendationPanel";
import HistoricalVsForecastChart from "../components/HistoricalVsForecastChart";
import MaterialDashboard from "../components/MaterialDashboard";
import FeatureImportancePanel from "../components/FeatureImportancePanel";
import { getDashboardData } from "../services/dashboardService";
import { useParams, useNavigate } from "react-router-dom";
import MapPreview from "../components/MapPreview";
import FullMap from "./FullMap";
import SmartAlertPopup from "../components/SmartAlertPopup";
import axios from "axios";
import SupplierReliabilityDonut from "../components/SupplierReliabilityDonut";

const Dashboard = () => {
  const navigate = useNavigate();
  const { projId } = useParams(); // ✅ route param
  const activeProjectId = projId || localStorage.getItem("currentProjectId"); // ✅ fallback
  const [loading, setLoading] = useState(true);
  const [projectInfo, setProjectInfo] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [recommendationsData, setRecommendationsData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [alertData, setAlertData] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  // // Prepare WeatherAlert component safely
  // let weatherAlertComponent = null;
  // if (projectInfo) {
  //   weatherAlertComponent = <WeatherAlert project={projectInfo} />;
  // }
  const [historicalData, setHistoricalData] = useState([]);
  const [summary, setSummary] = useState({});
  const [featureImportance, setFeatureImportance] = useState([]);

  // ✅ Fetch project info from Firestore
  useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    console.log("👤 Auth resolved:", user?.uid);

    if (!user) {
      console.warn("⚠️ User not logged in yet");
      return;
    }

    if (!activeProjectId) {
      console.warn("⚠️ No project ID found");
      return;
    }

    const docRef = doc(db, "users", user.uid, "projects", activeProjectId);
    console.log("📂 Firestore path:", `/users/${user.uid}/projects/${activeProjectId}`);

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("✅ Project Data:", data);
      console.log("📍 Stored Lat/Lon:", data.latitude, data.longitude);

      // ✅ Force add projectId if missing
      data.projectId = activeProjectId;
      localStorage.setItem("projectDetails", JSON.stringify(data));

      setProjectInfo(data);
    } else {
      console.warn("❌ Project not found!");
    }
  });

  return () => unsubscribe();
}, [projId, activeProjectId]);

const [selectedMaterial, setSelectedMaterial] = useState("All");
  // ✅ Fetch ML dashboard results (Multi-Material Mode)
useEffect(() => {
  if (!projectInfo) return;

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const payload = {
        filename: projectInfo.uploadedCsvFileName,
        projectName: projectInfo.projectName,
        projectType: projectInfo.projectType,
        startDate: projectInfo.startDate,
        endDate: projectInfo.endDate,
        location: projectInfo.location,
       materials: JSON.stringify(
  (projectInfo.materials || []).map(m => ({
    material: m.material || m.name || m,   // fallback smartness 🤓
    horizon_months: m.horizon_months || 6,
    lead_time_days: m.lead_time_days || projectInfo.lead_time_days || 10,
    current_inventory: m.current_inventory || projectInfo.current_inventory || 0,
    supplierReliability: m.supplierReliability || projectInfo.supplierReliability || 100,
    deliveryTimeDays: m.deliveryTimeDays || projectInfo.deliveryTimeDays || 0,
    contractorTeamSize: m.contractorTeamSize || projectInfo.contractorTeamSize || 0,
    projectBudget: m.projectBudget || projectInfo.projectBudget || 0,
    weather: projectInfo.weather || "",
    region_risk: projectInfo.region_risk || "",
    projectName: projectInfo.projectName,
    projectType: projectInfo.projectType,
    location: projectInfo.location, 
    startDate: projectInfo.startDate,
    endDate: projectInfo.endDate
  }))
),
      };

      console.log("📦 Sending materials JSON:", payload.materials);
      console.log("🚀 Sending dashboard payload:", payload);

      const result = await getDashboardData(payload);
      
      setForecastData(result.forecast || []);
setRecommendationsData(result.recommendations || []);
setSummary(result.summary || {});
setHistoricalData(result.historical || []); // ✅ new
console.log("📊 Feature Importance from backend:", result.summary?.feature_importance);
if (result.summary?.feature_importance) {
  const formattedImportance = Object.entries(result.summary.feature_importance).map(
    ([feature, importance]) => ({
      feature,
      importance: Number(importance) / 100,
    })
  );
  setFeatureImportance(formattedImportance);
} else {
  setFeatureImportance([]);
}

      // ✅ Backend will return array: forecast[] + recommendations[]
      const forecasts = (result.forecast || []).map(f => ({
        ...f,
        material: f.material
      }));

      const recs = (result.recommendations || []).map(r => ({
        ...r,
        material: r.material
      }));

      // setForecastData(forecasts);
      // setRecommendationsData(recs);

    } catch (err) {
      console.error("🔥 Dashboard ML Multi-Material Error:", err);
    } finally {
      setLoading(false);
    }
  };

  loadDashboard();
}, [projectInfo]);

  useEffect(() => {
  const fetchSmartAlert = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user || !activeProjectId) return;

      const docRef = doc(db, "users", user.uid, "projects", activeProjectId);
      const projSnap = await getDoc(docRef);
      if (!projSnap.exists()) return;

      const proj = projSnap.data();

      const payload = {
        projectName: proj.projectName,
        location: proj.location,
        latitude: proj.latitude,
        longitude: proj.longitude,
        phase: proj.projectPhase,
        structure_type: proj.projectType,
        materials: (proj.materials || []).map(m => m.material)
      };

      const res = await axios.post("http://127.0.0.1:8000/smart-alert-v3", payload);
      console.log("Alert Response:", res.data);

       if (res.data.risk_level && res.data.risk_level !== "Low") {
        setAlertData(res.data);
        setShowAlert(true);
      }
    } catch (err) {
      console.error("❌ Smart alert failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (projectInfo) fetchSmartAlert(); 
}, [projectInfo]);

if (loading) return <Layout><p className="text-white">Loading dashboard...</p></Layout>;
if (!projectInfo) return <Layout><p className="text-white">No project info found</p></Layout>;

  // ✅ Prepare map data safely once projectInfo is loaded
  const mapData = {
    buildingAddress: projectInfo.buildingAddress || "",
    localArea: projectInfo.localArea || "",
    city: projectInfo.city || "",
    state: projectInfo.state || "",
    pincode: projectInfo.pincode || "",
    latitude: projectInfo.latitude || "",
    longitude: projectInfo.longitude || "",
    location: projectInfo.location || ""
  };

// Normalize material keys so backend mismatch won't break aggregation
const normalizedForecast = forecastData.map(f => ({
  ...f,
  material: f.material || f.Material || f.material_name
}));

// ✅ Filter for one / all materials
const filteredData = selectedMaterial === "All"
  ? normalizedForecast
  : normalizedForecast.filter(f => f.material === selectedMaterial);

// ✅ Fix forecast value key mismatch
// ✅ Normalize forecast key
const cleanedData = filteredData.map(item => ({
  ...item,
  forecastValue:
    Number(item.forecasted_demand) ||
    Number(item.forecast) ||
    Number(item.yhat) ||
    Number(item.prediction) ||
    0
}));
const totalForecast =
  cleanedData.length > 0
    ? cleanedData[cleanedData.length - 1].forecastValue
    : 0;

// ✅ Material details for selected one
const materialInfo = selectedMaterial === "All"
  ? null
  : projectInfo.materials?.find(m => 
      m.material === selectedMaterial || m.name === selectedMaterial
    );

// ✅ Inventory aggregate if ALL selected
const currentInventory = selectedMaterial === "All"
  ? (projectInfo.materials || [])
      .reduce((acc, m) => acc + (Number(m.current_inventory) || 0), 0)
  : (Number(materialInfo?.current_inventory) || 0);

// ✅ Budget
const budget = selectedMaterial === "All"
  ? (projectInfo.materials || [])
      .reduce((acc, m) => acc + (Number(m.projectBudget) || 0), 0)
  : (Number(materialInfo?.projectBudget) || 0);

// ✅ Reliability average
const reliability = selectedMaterial === "All"
  ? Math.round(
      (projectInfo.materials || []).reduce(
        (acc, m) => acc + (Number(m.supplierReliability) || 0),
        0
      ) / (projectInfo.materials?.length || 1)
    )
  : (Number(materialInfo?.supplierReliability) || projectInfo.supplierReliability);

// ✅ Lead time average
const leadTime = selectedMaterial === "All"
  ? Math.round(
      (projectInfo.materials || []).reduce(
        (acc, m) => acc + (Number(m.lead_time_days) || 0),
        0
      ) / (projectInfo.materials?.length || 1)
    )
  : (Number(materialInfo?.lead_time_days) || projectInfo.lead_time_days);

  // ✅ Extract supplier reliability data for donuts
const suppliers =
  (projectInfo.materials || []).map((m, index) => ({
    name: m.supplierName || m.material || `Supplier ${index + 1}`,
    reliability: m.supplierReliability || projectInfo.supplierReliability || 100,
  }));


  return (
    <Layout projectName={projectInfo.projectName}projectStatus={projectInfo.status || "Active"}>
     <div className="flex items-center gap-3 mb-3">
  <label className="text-white font-medium">View:</label>

  <select
    className="px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white"
    value={selectedMaterial}
    onChange={(e) => setSelectedMaterial(e.target.value)}
  >
    <option value="All">All Materials</option>
    {[...new Set(forecastData.map(f => f.material))].map(m => (
      <option key={m} value={m}>{m}</option>
    ))}
  </select>
  {/* 👇 Display Project Phase */}
  {projectInfo?.projectPhase && (
    <div className="flex items-center gap-2">
      <span className="text-gray-300 text-sm">Current Phase:</span>
      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.6)] backdrop-blur-sm">
        {projectInfo.projectPhase}
      </span>
    </div>
  )}
  {/* {weatherAlertComponent} */}
</div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">

  <MetricCard
    title="Total Forecasted Material"
    value={`${totalForecast.toLocaleString()} tons`}
    progress={totalForecast > 0 ? 70 : 0}
    gradientClass="bg-gradient-to-br from-[#005C97] to-[#363795]"
  />

  <MetricCard
    title="Current Inventory"
    value={`${currentInventory.toLocaleString()} tons`}
    progress={
      totalForecast > 0
        ? Math.min(100, (currentInventory / totalForecast) * 100)
        : 0
    }
    gradientClass="bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364]"
  />

  <MetricCard
    title="Supplier Reliability"
    value={`${reliability}%`}
    progress={reliability}
    gradientClass="bg-gradient-to-br from-[#1d976c] to-[#93f9b9]"
  />

  <MetricCard
    title="Budget Status"
    value={`₹${budget.toLocaleString()}`}
    progress={60}
    gradientClass="bg-gradient-to-br from-[#c04848] to-[#480048]"
  />

  <MetricCard
    title="Lead Time"
    value={`${leadTime} days`}
    progress={50}
    gradientClass="bg-gradient-to-br from-[#5f2c82] to-[#49a09d]"
  />
</div>

<FeatureImportancePanel featureImportance={featureImportance} />



<div className="mt-10">
  {/* Full-width Material Forecast */}
  <MaterialForecastChart
    forecastData={forecastData}
    selectedMaterial={selectedMaterial}
  />

  {/* Recommendation Panel below */}
  <div className="mt-8">
    <RecommendationPanel recommendationsData={recommendationsData} />
  </div>
</div>

{/* 🧠 Supplier Reliability Donuts Section */}
<div className="mt-10 bg-gray-900 p-6 rounded-xl shadow-lg">
  <h2 className="text-xl font-semibold text-white mb-4">
    Supplier Reliability Overview
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {suppliers.map((s, index) => (
      <SupplierReliabilityDonut
        key={index}
        supplierName={s.name}
        reliability={s.reliability}
      />
    ))}
  </div>
</div>

<HistoricalVsForecastChart
  forecastData={forecastData}
  historicalData={historicalData} // <- use this directly
/>
          
          {/* 📍 Google Map Preview Section */}
          <div className="bg-[#1e293b] p-4 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold text-white mb-2">📍 Project Location</h2>
            
            {/* ✅ Add Map Preview here */}
            {mapData.city || mapData.state ? (
              <div className="mt-6 cursor-pointer"
              onClick={() => navigate(`/fullmap/${projId}`, {  state: {
                locationData: {
                  latitude: mapData.latitude,
                  longitude: mapData.longitude,
                  buildingAddress: mapData.buildingAddress,
                  localArea: mapData.localArea,
                  city: mapData.city,
                  state: mapData.state,
                  weather: projectInfo.weather,
                  temperature: projectInfo.temperature,
                  humidity: projectInfo.humidity,
                  windSpeed: projectInfo.windSpeed,
                  rainPossibility: projectInfo.rainPossibility},
              },
            })
          }
          >
      <MapPreview formData={mapData} />
    </div>
  ) : (
    <p className="text-gray-400">No location data available.</p>
  )}
</div>


    {/* ✅ Material table same width as charts */}
 <MaterialDashboard
  materials={forecastData.map(item => {
    const matInfo = projectInfo.materials?.find(m => m.material === item.material) || {};
    const historicalTotal = item.quantity ?? item.historical_quantity ?? 0;

    return {
      material: item.material || "Unknown",
      historical_total: historicalTotal,
      forecasted_demand: item.forecasted_demand ?? item.forecast ?? item.yhat ?? 0,
      current_inventory: matInfo.current_inventory ?? 0,
      supplier: matInfo.supplierName ?? "N/A",
      leadTime: matInfo.lead_time_days ?? 0,
    };
  })}
  bulkOrders={recommendationsData.map(item => ({
    material: item.material,
    recommended_order_quantity: item.recommended_order_quantity,
    urgency: item.urgency,
    insight_reason: item.insight_reason,
    recommended_order_date: item.recommended_order_date,
  }))}
  summary={summary}
/>
    </Layout>
  );
};

export default Dashboard;