import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";

const HistoricalVsForecastChart = ({ projectData }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!projectData) return;

    const fetchData = async () => {
      try {
        const formData = new FormData();
        formData.append("filename", projectData.csvFilename);
        formData.append("material", projectData.material);
        formData.append("horizon_months", projectData.horizon_months);

        const res = await axios.post("http://127.0.0.1:8000/forecast", formData);
        const forecast = res.data; // array of { forecast_date, yhat, material }

        setData({
          timeline: forecast.map(f => new Date(f.forecast_date).toLocaleString('default', { month: 'short', year: 'numeric' })),
          historical: forecast.map(f => f.yhat * 0.8), // you can adjust if you have real historical data
          forecast: forecast.map(f => f.yhat)
        });
      } catch (err) {
        console.error("Error fetching historical vs forecast:", err);
      }
    };

    fetchData();
  }, [projectData]);

  if (!data) return <p className="text-gray-300">Loading comparison chart...</p>;

  const chartData = {
    labels: data.timeline,
    datasets: [
      {
        label: "Historical Usage",
        data: data.historical,
        yAxisID: "y1",
        borderColor: "rgba(255, 99, 132, 0.7)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.4
      },
      {
        label: "Forecasted Usage",
        data: data.forecast,
        yAxisID: "y2",
        borderColor: "rgba(54, 162, 235, 0.7)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: { legend: { position: "top", labels: { color: "white" } } },
    scales: {
      x: { ticks: { color: "white" }, grid: { color: "#444" } },
      y1: { type: "linear", position: "left", ticks: { color: "white" }, grid: { color: "#444" } },
      y2: { type: "linear", position: "right", ticks: { color: "white" }, grid: { drawOnChartArea: false } },
    },
  };

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-4 rounded-xl shadow-lg text-white mt-4">
      <h3 className="text-lg font-bold mb-2">Historical vs Forecast</h3>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default HistoricalVsForecastChart;