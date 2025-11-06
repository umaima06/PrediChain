// src/components/HistoricalVsForecastChart.jsx
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

const HistoricalVsForecastChart = ({ projectData, forecastData, historicalData }) => {
  const [payload, setPayload] = useState({
    historical: historicalData || [],
    forecast: forecastData || [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (historicalData && forecastData) {
      setPayload({ historical: historicalData, forecast: forecastData });
      return;
    }

    if (!projectData) {
      if (forecastData?.length) {
        setPayload((p) => ({ ...p, forecast: forecastData }));
      }
      return;
    }

    let cancel = false;

    const fetchData = async () => {
      const filename =
        projectData.uploadedCsvFileName ||
        projectData.csvFilename ||
        projectData.filename;
      const material = projectData.material;
      const horizon = projectData.horizon_months || 6;

      if (!filename || !material) return;

      try {
        setLoading(true);
        const fd = new FormData();
        fd.append("filename", filename);
        fd.append("material", material);
        fd.append("horizon_months", horizon);

        const res = await axios.post("http://127.0.0.1:8000/historical_forecast", fd);
        if (cancel) return;

        setPayload({
          historical: res.data?.historical ?? [],
          forecast: res.data?.forecast ?? [],
        });
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    fetchData();
    return () => (cancel = true);
  }, [projectData, forecastData, historicalData]);

  const series = useMemo(() => {
    const hist = (payload.historical || []).map((h) => ({
      date: new Date(h.date || h.ds || h.forecast_date),
      value: Number(h.quantity ?? h.yhat ?? 0),
    }));

    const fc = (payload.forecast || []).map((f) => ({
      date: new Date(f.forecast_date || f.ds),
      value: Number(f.yhat ?? f.forecasted_demand ?? 0),
    }));

    const months = [...new Set([...hist, ...fc].map((i) =>
      new Date(i.date.getFullYear(), i.date.getMonth(), 1).toISOString()
    ))]
      .map((m) => new Date(m))
      .sort((a, b) => a - b);

    return {
      labels: months.map((m) =>
        m.toLocaleString("default", { month: "short", year: "numeric" })
      ),
      histValues: months.map((m) => {
        const key = new Date(m.getFullYear(), m.getMonth(), 1).toISOString();
        return hist.filter((x) =>
          new Date(x.date).toISOString().startsWith(key.slice(0, 7))
        ).reduce((a, b) => a + b.value, 0);
      }),
      fcValues: months.map((m) => {
        const key = new Date(m.getFullYear(), m.getMonth(), 1).toISOString();
        return fc.filter((x) =>
          new Date(x.date).toISOString().startsWith(key.slice(0, 7))
        ).reduce((a, b) => a + b.value, 0);
      }),
    };
  }, [payload]);

  const labels = series?.labels ?? [];
  const histData = series?.histValues ?? [];
  const fcData = series?.fcValues ?? [];

  if (loading || !Array.isArray(labels) || !Array.isArray(histData) || !Array.isArray(fcData)) {
    return <div className="text-gray-300 p-4">Loading chart data... ⏳</div>;
  }

  if (labels.length === 0) {
    return <div className="text-gray-300 p-4">No chart data available 🙃</div>;
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: "Historical Usage",
        data: histData,
        borderColor: "rgba(255,140,50,0.9)",
        backgroundColor: "rgba(255,140,50,0.2)",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
      },
      {
        label: "Forecasted Usage",
        data: fcData,
        borderColor: "rgba(50,140,255,0.9)",
        backgroundColor: "rgba(50,140,255,0.2)",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
      },
    ],
  };

  // Insights
  const totalHistorical = histData.reduce((a, b) => a + b, 0);
  const totalForecast = fcData.reduce((a, b) => a + b, 0);
  const latestMonth = labels[labels.length - 1];
  const latestForecast = fcData[fcData.length - 1];

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 bg-[#0b1220] rounded-lg text-white">
      <div className="flex-1">
        <h3 className="text-xl mb-2 font-semibold">📊 Historical vs Forecast</h3>
        <Line data={chartData} />
        <div className="mt-4 p-4 bg-[#121a2c] rounded-lg">
          <h4 className="font-medium text-lg mb-2">📈 Insights</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Total historical usage: {totalHistorical.toLocaleString()}</li>
            <li>Total forecasted usage: {totalForecast.toLocaleString()}</li>
            <li>Next month ({latestMonth}) forecast: {latestForecast.toFixed(2)}</li>
            {latestForecast > totalHistorical / labels.length &&
              <li>⚠️ Forecast trending higher than average historical usage</li>
            }
          </ul>
        </div>
      </div>

      <div className="w-full md:w-1/3 overflow-auto bg-[#121a2c] rounded-lg p-4">
        <h4 className="font-medium text-lg mb-2">📋 Data Table</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="p-2 text-left">Month</th>
              <th className="p-2 text-right">Historical</th>
              <th className="p-2 text-right">Forecast</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((lbl, idx) => (
              <tr key={idx} className="border-b border-gray-700 hover:bg-[#1b243a]">
                <td className="p-2">{lbl}</td>
                <td className="p-2 text-right">{histData[idx].toFixed(2)}</td>
                <td className="p-2 text-right">{fcData[idx].toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoricalVsForecastChart;