
import React, { useMemo } from "react";
import {
LineChart,
Line,
XAxis,
YAxis,
Tooltip,
CartesianGrid,
ResponsiveContainer,
} from "recharts";

const MaterialForecastChart = ({ forecastData, selectedMaterial }) => {
// 🧠 Step 1: Clean and format data
const filteredData = useMemo(() => {
if (!forecastData || forecastData.length === 0) return [];

const data =  
  selectedMaterial === "All"  
    ? forecastData  
    : forecastData.filter((f) => f.material === selectedMaterial);  

const grouped = {};  
data.forEach((item) => {  
  const rawDate = item.forecast_date || item.date;  
  const forecast = Number(  
    item.yhat || item.forecasted_demand || item.forecast || 0  
  );  
  if (!rawDate) return;  

  // Convert to standardized month-year format  
  const month = new Date(rawDate).toISOString().slice(0, 7); // e.g. "2025-11"  

  if (!grouped[month]) grouped[month] = { month, forecast: 0 };  
  grouped[month].forecast += forecast;  
});  

// Sort months chronologically  
const sorted = Object.values(grouped).sort(  
  (a, b) => new Date(a.month) - new Date(b.month)  
);  

return sorted;

}, [forecastData, selectedMaterial]);

// 🧮 Step 2: Generate AI-style insights
const insight = useMemo(() => {
if (!filteredData.length)
return "Not enough data for generating forecast insights.";

const forecasts = filteredData.map((d) => d.forecast);  
const first = forecasts[0];  
const last = forecasts[forecasts.length - 1];  
const change = ((last - first) / (first || 1)) * 100;  

const peak = Math.max(...forecasts);  
const peakMonth = filteredData.find((d) => d.forecast === peak)?.month;  

let trend =  
  change > 10  
    ? "increasing steadily 📈"  
    : change < -10  
    ? "decreasing 📉"  
    : "relatively stable ⚖️";  

const materialName =  
  selectedMaterial === "All"  
    ? "Overall material demand"  
    : `${selectedMaterial} demand`;  

return `Forecast Insight: ${materialName} is ${trend}. Expected peak in ${new Date(  
  peakMonth + "-01"  
).toLocaleString("en-US", {  
  month: "long",  
  year: "numeric",  
})} with approximately ${peak.toFixed(0)} tons.`;

}, [filteredData, selectedMaterial]);

// 🧩 Step 3: Short trend summary bar
const materialTrends = useMemo(() => {
if (!forecastData || forecastData.length === 0) return [];

const mats = [...new Set(forecastData.map((f) => f.material))];  

return mats.map((mat) => {  
  const matData = forecastData  
    .filter((d) => d.material === mat)  
    .sort((a, b) => new Date(a.forecast_date || a.date) - new Date(b.forecast_date || b.date));  

  if (matData.length < 2)  
    return { material: mat, trend: "↔️ Stable", change: 0 };  

  const start = Number(  
    matData[0].yhat ||  
      matData[0].forecasted_demand ||  
      matData[0].forecast ||  
      0  
  );  
  const end = Number(  
    matData[matData.length - 1].yhat ||  
      matData[matData.length - 1].forecasted_demand ||  
      matData[matData.length - 1].forecast ||  
      0  
  );  

  const change = ((end - start) / (start || 1)) * 100;  
  let trend = "↔️ Stable";  
  if (change > 8) trend = "📈 Rising";  
  else if (change < -8) trend = "📉 Falling";  

  return { material: mat, change: change.toFixed(1), trend };  
});

}, [forecastData]);

// 🧩 Step 4: Handle empty data gracefully
if (!filteredData.length) {
return (
<div className="bg-[#111827] text-gray-300 border border-gray-700 rounded-2xl p-6 text-center shadow-md">
<h2 className="text-lg font-semibold mb-2">📊 Material Forecast</h2>
<p>No forecast data available yet.</p>
</div>
);
}

console.log("📊 Forecast Data Debug:", filteredData.slice(0, 10));

return (
<div className="bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] p-6 rounded-3xl shadow-2xl text-gray-100">
<h2 className="text-2xl font-semibold mb-4">
📈 Material Forecast Trends
</h2>

<div className="w-full h-[360px] bg-[#111827] rounded-2xl shadow-inner p-3 mb-6">  
    <ResponsiveContainer width="100%" height="100%">  
      <LineChart data={filteredData}>  
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />  
       <XAxis
  dataKey="month"
  label={{
    value: "Month",
    position: "insideBottomRight",
    offset: -5,
    fill: "#9ca3af",
  }}
  tickFormatter={(m) =>
    new Date(m + "-01").toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    })
  }
  interval={0} // forces all months to show in order
  tick={{ fill: "#e5e7eb", fontSize: 12 }}
/>
<YAxis
  label={{
    value: "Forecasted Demand (tons)",
    angle: -90,
    position: "insideLeft",
    fill: "#9ca3af",
  }}
  tickFormatter={(val) => `${val.toFixed(0)}`}
  tick={{ fill: "#e5e7eb", fontSize: 12 }}
/>
        <Tooltip  
          contentStyle={{  
            backgroundColor: "#1f2937",  
            borderRadius: "10px",  
            border: "1px solid #475569",  
            color: "#f9fafb",  
          }}  
          formatter={(value) => [`${value.toFixed(1)} tons`, "Forecast"]}  
        />  
        <Line  
          type="monotone"  
          dataKey="forecast"  
          stroke="#38bdf8"  
          strokeWidth={3}  
          dot={{ r: 4, fill: "#38bdf8" }}  
          name="Forecasted Demand"  
        />  
      </LineChart>  
    </ResponsiveContainer>  
  </div>  

  {/* 🧠 Forecast Insight */}  
  <div className="bg-[#0f172a]/80 p-4 rounded-2xl border border-gray-700 mb-4 shadow-lg">  
    <h3 className="text-lg font-semibold text-blue-300 mb-2">  
      🔍 Forecast Insight  
    </h3>  
    <p className="text-gray-200 leading-relaxed">{insight}</p>  
  </div>  

  {/* 📊 Mini trend summary */}  
  <div className="bg-[#1e293b]/70 p-4 rounded-2xl border border-gray-600 shadow-md">  
    <h4 className="text-md font-semibold text-gray-100 mb-3">  
      🌡️ Top Material Trends  
    </h4>  
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">  
      {materialTrends.map((t, i) => (  
        <div  
          key={i}  
          className="bg-[#0f172a] rounded-xl p-3 text-center border border-gray-700 hover:border-blue-400 transition-all duration-300"  
        >  
          <span className="text-sm font-semibold text-gray-100 block mb-1">  
            {t.material}  
          </span>  
          <span className="text-sm">{t.trend}</span>  
          <span  
            className={`text-xs mt-1 block ${  
              t.change > 5  
                ? "text-green-400"  
                : t.change < -5  
                ? "text-red-400"  
                : "text-gray-400"  
            }`}  
          >  
            {t.change}%  
          </span>  
        </div>  
      ))}  
    </div>  
  </div>  
</div>

);
};

export default MaterialForecastChart;