import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import axios from "axios";
import MetricCard from "../components/MetricCard";
import MaterialForecastChart from "../components/MaterialForecastChart";
import RecommendationPanel from "../components/RecommendationPanel";
import HistoricalVsForecastChart from "../components/HistoricalVsForecastChart";
import MapPreview from "../components/MapPreview";
import { useNavigate } from "react-router-dom";
import FullMap from "./FullMap";

const Dashboard = ({ projectId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectInfo, setProjectInfo] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [recommendationsData, setRecommendationsData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);

  // 1️⃣ Fetch project info from Firebase
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        if (!auth.currentUser) return;

        const projectsRef = collection(db, "projects");
        const q = query(projectsRef, where("uid", "==", auth.currentUser.uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setProjectInfo(docData);
          setInventoryData(docData.inventory || []);
        }
      } catch (err) {
        console.error("Error fetching project dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  // 2️⃣ Fetch forecast + recommendations from backend
  useEffect(() => {
    const fetchForecastAndRecommendations = async () => {
      if (!projectInfo) return;

      try {
        // Assume projectInfo.materials = ["Cement", "Steel Rebar", "Gravel"]
        const allForecasts = [];
        const allRecommendations = [];

        for (let material of projectInfo.materials || []) {
          const formData = new FormData();
          formData.append('filename', projectInfo.uploadedCsvFileName); // CSV uploaded earlier
          formData.append('material', material);
          formData.append('lead_time_days', projectInfo.lead_time_days || 10);
          formData.append('current_inventory', projectInfo.inventory?.find(i => i.material === material)?.quantity || 0);

          const res = await axios.post('http://127.0.0.1:8000/recommendation', formData);
          allForecasts.push(...res.data.forecast);
          allRecommendations.push(...res.data.recommendations);
        }

        setForecastData(allForecasts);
        setRecommendationsData(allRecommendations);
      } catch (err) {
        console.error("Error fetching forecast/recommendations:", err);
      }
    };

    fetchForecastAndRecommendations();
  }, [projectInfo]);

  if (loading) return <Layout><p className="text-white">Loading dashboard...</p></Layout>;
  if (!projectInfo) return <Layout><p className="text-white">No project data found</p></Layout>;

  // --- Metrics calculations ---
  const totalForecast = forecastData.reduce((acc, item) => acc + (item.forecasted_demand || 0), 0);
  const currentInventory = inventoryData.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const avgSupplierReliability = projectInfo?.supplierReliability || 0;
  const budgetStatus = projectInfo?.projectBudget || 0;
  const leadTime = projectInfo?.lead_time_days || 0;

  return (
    <Layout projectName={projectInfo?.projectName} projectStatus={projectInfo?.status || "Active"}>
      {/* --- Top Metrics Row --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard title="Total Forecasted Material" value={`${totalForecast.toLocaleString()} tons`} progress={70} gradientClass="bg-gradient-to-r from-purple-600 to-indigo-500" />
        <MetricCard title="Current Inventory" value={`${currentInventory.toLocaleString()} tons`} progress={(currentInventory/totalForecast)*100} gradientClass="bg-gradient-to-r from-green-500 to-teal-400" />
        <MetricCard title="Supplier Reliability" value={`${avgSupplierReliability}%`} progress={avgSupplierReliability} gradientClass="bg-gradient-to-r from-yellow-400 to-orange-500" />
        <MetricCard title="Budget Status" value={`$${budgetStatus.toLocaleString()}`} progress={60} gradientClass="bg-gradient-to-r from-pink-500 to-red-500" />
        <MetricCard title="Lead Time (Days)" value={leadTime} progress={50} gradientClass="bg-gradient-to-r from-blue-500 to-cyan-500" />
      </div>

      {/* --- Forecast Section --- */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MaterialForecastChart forecastData={forecastData} />
          <HistoricalVsForecastChart forecastData={forecastData} />
        </div>
        <div>
          <RecommendationPanel recommendationsData={recommendationsData} />
        </div>
      </div>

       {/* 🗺️ Add map preview */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-white mb-3">Project Location</h2>
        <MapPreview
          latitude={projectInfo?.latitude}
          longitude={projectInfo?.longitude}
          onClick={() => navigate(`/map/${projectInfo?.id}`)}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;