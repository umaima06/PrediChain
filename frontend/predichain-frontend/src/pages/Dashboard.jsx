import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import axios from "axios";
import MetricCard from "../components/MetricCard";
import MaterialForecastChart from "../components/MaterialForecastChart";
import RecommendationPanel from "../components/RecommendationPanel";
import HistoricalVsForecastChart from "../components/HistoricalVsForecastChart";

const Dashboard = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [projectInfo, setProjectInfo] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);

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
          <MaterialForecastChart projectData={projectInfo} />
          <HistoricalVsForecastChart projectData={projectInfo} />
        </div>
        <div>
          <RecommendationPanel projectData={projectInfo} />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;