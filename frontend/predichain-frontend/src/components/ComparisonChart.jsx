import React from "react";
import { Line } from "react-chartjs-2";

const ComparisonChart = ({ data }) => {
  const chartData = {
    labels: data?.labels || ["Jan", "Feb", "Mar"],
    datasets: [
      {
        label: "Historical Usage",
        data: data?.historical || [30, 40, 50],
        borderColor: "#5C3AFF",
        backgroundColor: "rgba(92,58,255,0.2)",
        tension: 0.3,
      },
      {
        label: "Forecast",
        data: data?.forecast || [35, 45, 55],
        borderColor: "#A883FF",
        backgroundColor: "rgba(168,131,255,0.2)",
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { labels: { color: "#fff" } } },
    scales: { x: { ticks: { color: "#fff" } }, y: { ticks: { color: "#fff" } } },
  };

  return (
    <div className="bg-gray-900/70 p-4 rounded-xl shadow-[0_0_30px_5px_rgba(92,58,255,0.3)] mt-6">
      <h2 className="text-gray-200 font-semibold mb-2">Historical vs Forecast</h2>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ComparisonChart;