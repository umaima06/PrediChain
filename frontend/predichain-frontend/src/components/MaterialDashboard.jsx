import React, { useMemo } from "react";

const MaterialDashboard = ({ materials = [] }) => {
  // ✅ Aggregate by material
  const aggregated = useMemo(() => {
    const map = {};

    materials.forEach((item) => {
      const mat = item.material || "Unknown";
      if (!map[mat]) {
        map[mat] = {
          material: mat,
          forecast: 0,
          inventory: item.current_inventory || 0,
          supplier: item.supplier || "N/A",
          leadTime: item.leadTime || "-",
          historicalTotal: 0,
          action: "ok",
        };
      }
      // Sum all forecast entries for this material
      map[mat].forecast += Number(item.forecasted_demand ?? item.forecast ?? 0);
      map[mat].historicalTotal += Number(item.historical_total ?? 0);
      // Determine action
      map[mat].action = map[mat].inventory < map[mat].forecast ? "urgent" : "ok";
    });

    return Object.values(map);
  }, [materials]);

  if (aggregated.length === 0) {
    return (
      <div className="text-gray-400 text-sm p-4 bg-gray-800/40 rounded-lg">
        No materials data yet 👀 Upload CSV & generate forecast to see insights!
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#0c1224] via-[#141b33] to-[#0b1220] p-5 rounded-xl shadow-[0_0_25px_4px_rgba(125,92,255,0.25)] mt-8 overflow-x-auto">
      <h2 className="text-gray-200 font-semibold text-lg mb-3">
        📦 Material Demand Dashboard
      </h2>

      <table className="min-w-full text-gray-200 text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-gray-300">
            <th className="py-2 px-4 text-left">Material</th>
            <th className="py-2 px-4">Historical<br/>Used</th>
            <th className="py-2 px-4">Forecast<br/>(Next Month)</th>
            <th className="py-2 px-4">Current<br/>Inventory</th>
            <th className="py-2 px-4">Supplier</th>
            <th className="py-2 px-4">Lead Time</th>
            <th className="py-2 px-4">Action</th>
          </tr>
        </thead>
        <tbody>
          {aggregated.map((m, i) => (
            <tr
              key={i}
              className={`border-b border-gray-800 hover:bg-gray-800/30 transition`}
            >
              <td className="py-2 px-4">{m.material}</td>
              <td className="py-2 px-4">{m.historicalTotal.toLocaleString()} tons</td>
              <td className="py-2 px-4 font-medium">{m.forecast.toLocaleString()} tons</td>
              <td className="py-2 px-4">{m.inventory.toLocaleString()} tons</td>
              <td className="py-2 px-4">{m.supplier}</td>
              <td className="py-2 px-4">{m.leadTime} days</td>
              <td className="py-2 px-4">
                {m.action === "urgent" ? (
                  <span className="text-red-400 font-semibold">⚠️ Order Soon</span>
                ) : (
                  <span className="text-green-400 font-semibold">✅ Sufficient</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 bg-white/5 p-3 rounded-md text-xs text-gray-300">
        🤖 <b>AI Insight:</b> Materials flagged “Order Soon” are forecasted to run below inventory. Plan procurement accordingly.
      </div>
    </div>
  );
};

export default MaterialDashboard;