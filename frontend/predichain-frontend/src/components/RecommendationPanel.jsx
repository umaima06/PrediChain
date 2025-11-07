import React, { useMemo } from "react";
import dayjs from "dayjs";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const RecommendationPanel = ({ recommendationsData }) => {
  // 🧹 Process per material
  const materials = useMemo(() => {
    if (!recommendationsData || !recommendationsData.length) return [];

    const grouped = {};
    recommendationsData.forEach((rec) => {
      const mat = rec.material || "Unknown";
      if (!grouped[mat]) grouped[mat] = [];
      grouped[mat].push(rec);
    });

    return Object.entries(grouped).map(([material, recs]) => {
      const sorted = [...recs].sort(
        (a, b) => new Date(a.forecast_date) - new Date(b.forecast_date)
      );

      const peak = sorted.reduce(
        (max, r) =>
          r.recommended_order_quantity > max.quantity
            ? { ...r, quantity: r.recommended_order_quantity }
            : max,
        { recommended_order_quantity: 0, forecasted_demand: 0, forecast_date: null, quantity: 0 }
      );

      const nextRec = sorted[0];
      let status = "🟢 Safe";
      if (nextRec.recommended_order_quantity > 0 && nextRec.recommended_order_quantity > (nextRec.current_inventory ?? 0))
        status = "🔴 Urgent";
      else if (nextRec.recommended_order_quantity > 0) status = "🟡 Medium";

      const insights = [];
      if (status === "🔴 Urgent") insights.push("Inventory low — order soon!");
      if (nextRec.supplier_reliability && nextRec.supplier_reliability < 80)
        insights.push("Supplier reliability below 80% — add buffer stock.");
      if (nextRec.weather && ["rainy", "humid"].includes(nextRec.weather?.toLowerCase()))
        insights.push("Weather/region risk high — keep extra stock.");
      if (!insights.length) insights.push("Looks good. Monitor monthly usage.");

      return { material, peakMonth: peak.forecast_date, peakQuantity: peak.recommended_order_quantity, nextRec, status, insights };
    });
  }, [recommendationsData]);

  // 🟢 Overall Summary Card
  const summary = useMemo(() => {
    if (!recommendationsData || !recommendationsData.length) return null;

    const totalForecast = recommendationsData.reduce((acc, r) => acc + (r.forecasted_demand || 0), 0);
    const totalRecommended = recommendationsData.reduce((acc, r) => acc + (r.recommended_order_quantity || 0), 0);
    const urgentOrders = recommendationsData.filter(
      (r) => r.recommended_order_quantity > 0 && r.recommended_order_quantity > (r.current_inventory ?? 0)
    ).length;
    const avgSupplier = recommendationsData.reduce((acc, r) => acc + (r.supplier_reliability ?? 0), 0) / recommendationsData.length;

    return {
      totalForecast,
      totalRecommended,
      urgentOrders,
      avgSupplier,
      recommendedPercent: totalForecast ? Math.min(100, (totalRecommended / totalForecast) * 100) : 0,
    };
  }, [recommendationsData]);

  if (!materials.length)
    return (
      <div className="bg-[#111827] text-gray-300 p-6 rounded-2xl text-center">
        <p>No procurement recommendations available yet.</p>
      </div>
    );

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-white mb-4">📋 Recommendations Panel</h2>

      {/* --- Overall Summary Card --- */}
      {summary && (
        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-md mb-6 border-l-8 border-blue-500">
          <h3 className="text-xl font-semibold text-white mb-2">📊 Overall Summary</h3>
          <p className="text-gray-300 mb-1">Urgent Orders: {summary.urgentOrders}</p>
          <p className="text-gray-300 mb-1">Avg Supplier Reliability: {summary.avgSupplier.toFixed(1)}%</p>
          <p className="text-gray-300 mb-2">Total Recommended vs Forecast: {summary.recommendedPercent.toFixed(1)}%</p>

          <div className="w-40 h-40 mx-auto">
            <Doughnut
              data={{
                labels: ["Recommended", "Remaining Forecast"],
                datasets: [
                  {
                    data: [summary.totalRecommended, Math.max(0, summary.totalForecast - summary.totalRecommended)],
                    backgroundColor: ["#3b82f6", "#64748b"],
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: { position: "bottom", labels: { color: "#e5e7eb" } },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* --- Material Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((mat, i) => (
          <div
            key={i}
            className={`bg-gradient-to-r p-6 rounded-2xl shadow-md border-l-8 ${
              mat.status === "🔴 Urgent"
                ? "border-red-500"
                : mat.status === "🟡 Medium"
                ? "border-yellow-400"
                : "border-green-400"
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-semibold text-white">{mat.material}</h3>
              <span className="text-sm font-medium">{mat.status}</span>
            </div>

            <p className="text-gray-300 mb-1">
              📅 Peak Month: {mat.peakMonth ? dayjs(mat.peakMonth).format("MMM YYYY") : "N/A"} — Forecasted Peak
            </p>

            <p className="text-gray-300 mb-1">
              🏗 Recommended Order: {mat.nextRec.recommended_order_quantity} by{" "}
              {dayjs(mat.nextRec.recommended_order_date).format("DD MMM YYYY")}
            </p>

            <p className="text-gray-300 mb-1">
              🏢 Supplier Reliability: {mat.nextRec.supplier_reliability != null ? `${mat.nextRec.supplier_reliability.toFixed(1)}%` : "N/A"}
            </p>

            {/* Insights */}
            <div className="bg-[#1e293b]/70 p-3 rounded-xl mt-3 border border-gray-600">
              <h4 className="text-md font-semibold text-gray-100 mb-1">💡 Insights</h4>
              <ul className="list-disc list-inside text-gray-200">
                {mat.insights.map((ins, idx) => (
                  <li key={idx}>{ins}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationPanel;