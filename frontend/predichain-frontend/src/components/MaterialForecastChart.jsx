// src/components/MaterialForecastChart.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Props:
 * - forecastData (optional): array of forecast records from backend (forecast_date, yhat, material)
 * - projectData (optional): object with filename, material, horizon_months...
 *
 * Either forecastData OR projectData should be provided. If projectData is provided but
 * forecastData is missing, this component will call backend /forecast endpoint.
 */
const MaterialForecastChart = ({ forecastData, projectData }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // helper to convert backend array -> chart data
  const buildChartFromRows = (rows) => {
    if (!rows || rows.length === 0) return null;
    // rows might use different keys, normalize:
    const normalized = rows.map((r) => ({
      date: r.forecast_date ? new Date(r.forecast_date) : new Date(r.ds || r.date),
      value: r.yhat ?? r.forecasted_demand ?? r.quantity ?? 0,
      material: r.material ?? r.Material_Name ?? (projectData && projectData.material),
    }));

    // sort by date
    normalized.sort((a, b) => a.date - b.date);

    const labels = normalized.map((r) =>
      r.date.toLocaleString(undefined, { month: "short", year: "numeric" })
    );
    const values = normalized.map((r) => Number(r.value || 0));

    return { labels, values, material: normalized[0]?.material || "Material" };
  };

  // Compute summary metrics via useMemo
  const summary = useMemo(() => {
    if (!data) return null;
    const total = data.values.reduce((a, b) => a + b, 0);
    const nextMonth = data.values[0] ?? 0;
    const avg = data.values.length ? total / data.values.length : 0;
    const trend = data.values.length >= 2 ? (data.values[data.values.length - 1] - data.values[0]) : 0;
    return { total, nextMonth, avg, trend };
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    const fetchIfNeeded = async () => {
      setError(null);

      // If consumer passed forecastData array, use it
      if (forecastData && Array.isArray(forecastData) && forecastData.length > 0) {
        const built = buildChartFromRows(forecastData);
        if (!cancelled) setData(built);
        return;
      }

      // Otherwise if projectData exists, call /forecast endpoint
      if (!projectData) {
        setError("No project or forecast data provided");
        return;
      }

      // require filename + material
      const filename = projectData.uploadedCsvFileName || projectData.csvFilename || projectData.filename;
      const material = projectData.material;
      const horizon = projectData.horizon_months || 6;

      if (!filename || !material) {
        setError("Project is missing filename or material — can't fetch forecast");
        return;
      }

      try {
        setLoading(true);
        const form = new FormData();
        form.append("filename", filename);
        form.append("material", material);
        form.append("horizon_months", horizon);

        const res = await axios.post("http://127.0.0.1:8000/forecast", form);
        if (cancelled) return;
        const built = buildChartFromRows(res.data || []);
        setData(built);
      } catch (err) {
        console.error("MaterialForecastChart fetch error:", err);
        setError("Failed to fetch forecast from backend");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchIfNeeded();
    return () => { cancelled = true; };
  }, [forecastData, projectData]);

  if (loading) return <div className="p-4 rounded-lg bg-gray-800/40 text-gray-200">Loading forecast...</div>;
  if (error) return <div className="p-4 rounded-lg bg-red-700/20 text-red-200">Error: {error}</div>;
  if (!data) return <div className="p-4 rounded-lg bg-gray-800/20 text-gray-300">No forecast data available</div>;

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: `${data.material} — forecast`,
        data: data.values,
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        borderColor: "rgba(99,102,241,1)", // indigo-500
        backgroundColor: "rgba(99,102,241,0.12)",
        pointRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "white" } },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { ticks: { color: "#d1d5db" }, grid: { color: "#2b2b2b" } },
      y: { ticks: { color: "#d1d5db" }, grid: { color: "#2b2b2b" } },
    },
  };

  return (
    <div className="bg-gradient-to-r from-[#0f172a] to-[#111827] p-4 rounded-xl shadow-md text-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">Material Forecast</h3>
          <p className="text-sm text-gray-300">Predicted monthly usage for <span className="font-medium text-white">{data.material}</span></p>
        </div>

        <div className="flex gap-3 items-center">
          <div className="text-right">
            <div className="text-sm text-gray-300">Next (month)</div>
            <div className="text-lg font-bold">{Math.round(summary.nextMonth).toLocaleString()}</div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-300">Total (horizon)</div>
            <div className="text-lg font-bold">{Math.round(summary.total).toLocaleString()}</div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-300">Trend</div>
            <div className={`text-lg font-bold ${summary.trend >= 0 ? "text-green-400" : "text-red-400"}`}>
              {summary.trend >= 0 ? "▲" : "▼"} {Math.abs(Math.round(summary.trend)).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

     <div className="mb-6">
  <h2 className="text-lg font-semibold text-gray-200 mb-2">📊 AI Material Demand Forecast</h2>

  <div className="bg-gradient-to-r from-teal-500 via-emerald-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
    <h3 className="text-lg font-bold mb-2">
      Material Forecast ({projectData?.material})
    </h3>

    <Line data={chartData} options={options} />

    {/* AI Insight */}
    <div className="mt-3 bg-white/10 backdrop-blur-md p-2 rounded-md text-sm">
      📌 <b>Insight:</b> Forecast helps optimize material ordering and avoid stock delays 🚚✨  
    </div>
  </div>
</div>
    </div>
  );
};

export default MaterialForecastChart;