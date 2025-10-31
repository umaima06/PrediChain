import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { db, auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import MetricCard from "../components/MetricCard";
import MaterialForecastChart from "../components/MaterialForecastChart";
import RecommendationPanel from "../components/RecommendationPanel";
import HistoricalVsForecastChart from "../components/HistoricalVsForecastChart";
import MaterialTable from "../components/MaterialTable";
import MapSection from "../components/MapSection";
import { getDashboardData } from "../services/dashboardService";
import { useParams } from "react-router-dom";

const Dashboard = () => {
  const { projId } = useParams(); // ✅ route param
  const activeProjectId = projId || localStorage.getItem("currentProjectId"); // ✅ fallback

  const [loading, setLoading] = useState(true);
  const [projectInfo, setProjectInfo] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [recommendationsData, setRecommendationsData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);

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

      // ✅ Force add projectId if missing
      data.projectId = activeProjectId;

      setProjectInfo(data);
    } else {
      console.warn("❌ Project not found!");
    }
  });

  return () => unsubscribe();
}, [projId, activeProjectId]);

  // ✅ Fetch ML dashboard results
  useEffect(() => {
    if (!projectInfo) return;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const allForecasts = [];
        const allRecs = [];

        const materials = projectInfo.materials || [projectInfo.material];

        for (let material of materials) {
          const fd = new FormData();
          fd.append("filename", projectInfo.uploadedCsvFileName);
          fd.append("material", material);
          fd.append("lead_time_days", projectInfo.lead_time_days || 10);
          fd.append("current_inventory", projectInfo.current_inventory || 0);
          fd.append("supplierReliability", projectInfo.supplierReliability || 100);
          fd.append("projectBudget", projectInfo.projectBudget || 0);
          fd.append("location", projectInfo.location || "");
          fd.append("projectName", projectInfo.projectName || "");
          fd.append("projectType", projectInfo.projectType || "");
          fd.append("startDate", projectInfo.startDate || "");
          fd.append("endDate", projectInfo.endDate || "");

          const result = await getDashboardData(fd);
      // OLD
// allForecasts.push(...(result.forecast || []));
// allRecs.push(...(result.recommendations || []));

// ✅ NEW
allForecasts.push(
  ...(result.forecast || []).map(f => ({ ...f, material }))
);

allRecs.push(
  ...(result.recommendations || []).map(r => ({ ...r, material }))
);
        }

        setForecastData(allForecasts);
        setRecommendationsData(allRecs);
      } catch (err) {
        console.error("🔥 Dashboard ML error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [projectInfo]);

  if (loading) return <Layout><p className="text-white">Loading dashboard...</p></Layout>;
  if (!projectInfo) return <Layout><p className="text-white">No project info found</p></Layout>;

  // ✅ Calculations
  const totalForecast = forecastData.reduce((acc, item) => acc + (item.forecasted_demand || 0), 0);
  const currentInventory = inventoryData.reduce((acc, item) => acc + (item.quantity || 0), 0);
   console.log("📦 Material table data:", forecastData);
  return (
    <Layout projectName={projectInfo.projectName} projectStatus={projectInfo.status || "Active"}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
       <MetricCard
  title="Total Forecasted Material"
  value={`${totalForecast.toLocaleString()} tons`}
  progress={70}
  gradientClass="bg-gradient-to-br from-[#005C97] to-[#363795]" // blue steel
/>

<MetricCard
  title="Current Inventory"
  value={`${currentInventory.toLocaleString()} tons`}
  progress={(totalForecast>0?(currentInventory/totalForecast)*100:0)}
  gradientClass="bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364]" // carbon teal
/>

<MetricCard
  title="Supplier Reliability"
  value={`${projectInfo.supplierReliability}%`}
  progress={projectInfo.supplierReliability}
  gradientClass="bg-gradient-to-br from-[#1d976c] to-[#93f9b9]" // green mint reliability
/>

<MetricCard
  title="Budget Status"
  value={`$${projectInfo.projectBudget}`}
  progress={60}
  gradientClass="bg-gradient-to-br from-[#c04848] to-[#480048]" // maroon luxury
/>

<MetricCard
  title="Lead Time"
  value={`${projectInfo.lead_time_days} days`}
  progress={50}
  gradientClass="bg-gradient-to-br from-[#5f2c82] to-[#49a09d]" // purple x aqua
/>
      </div>
    
       <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2 space-y-6">
    <MaterialForecastChart forecastData={forecastData} />
    <HistoricalVsForecastChart forecastData={forecastData} />
 <MapSection />
    {/* ✅ Material table same width as charts */}
    <MaterialTable
      materials={forecastData.map(item => {
        const forecast = item.forecasted_demand ?? item.forecast ?? 0;
        const inventory = projectInfo.current_inventory ?? 0;

        return {
          material: item.material || "Unknown",
          forecast,
          inventory,
          supplier: projectInfo.supplierName || "N/A",
          leadTime: projectInfo.lead_time_days || "-",
          action: forecast > inventory ? "urgent" : "ok",
        };
      })}
    />
  </div>

  <RecommendationPanel recommendationsData={recommendationsData} />
</div>
    </Layout>
  );
};

export default Dashboard;