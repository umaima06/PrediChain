import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";

const MaterialForecastChart = ({ projectData }) => {
  const [forecastData, setForecastData] = useState(null);

  useEffect(() => {
    if (!projectData) return;

    const fetchForecast = async () => {
      try {
        const formData = new FormData();
        formData.append("filename", projectData.csvFilename);
        formData.append("material", projectData.material);
        formData.append("horizon_months", projectData.horizon_months);

        const res = await axios.post("http://127.0.0.1:8000/forecast", formData);
        const forecast = res.data; // array of {forecast_date, yhat, material}

        const labels = forecast.map(f => new Date(f.forecast_date).toLocaleString('default', { month: 'short', year: 'numeric' }));
        const dataset = [
          {
            label: forecast[0]?.material || "Material",
            data: forecast.map(f => f.yhat),
            borderColor: "#4f46e5",
            backgroundColor: "#4f46e588",
            fill: false,
            tension: 0.4,
          }
        ];

        setForecastData({ labels, datasets: dataset });
      } catch (err) {
        console.error("Error fetching forecast:", err);
      }
    };

    fetchForecast();
  }, [projectData]);

  if (!forecastData) return <p className="text-gray-300">Loading forecast...</p>;

  return (
    <div className="bg-gradient-to-r from-purple-700 to-indigo-600 p-4 rounded-xl shadow-lg text-white">
      <h3 className="text-lg font-bold mb-2">Material Forecast</h3>
      <Line
        data={forecastData}
        options={{
          responsive: true,
          plugins: { legend: { position: "top", labels: { color: "white" } } },
          scales: {
            x: { ticks: { color: "white" }, grid: { color: "#444" } },
            y: { ticks: { color: "white" }, grid: { color: "#444" } },
          },
        }}
      />
    </div>
  );
};

export default MaterialForecastChart;