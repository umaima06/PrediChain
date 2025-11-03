import React from "react";

const MaterialTable = ({ materials = [] }) => {
  return (
    <div className="bg-gradient-to-br from-[#0c1224] via-[#141b33] to-[#0b1220] p-5 rounded-xl shadow-[0_0_25px_4px_rgba(125,92,255,0.25)] mt-8 overflow-x-auto">

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-gray-200 font-semibold text-lg">📦 Material Demand & Supply</h2>
          <p className="text-gray-400 text-xs">Inventory vs forecast — procurement readiness check</p>
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="text-gray-400 text-sm bg-gray-800/40 p-3 rounded-lg">
          No materials data found yet 👀  
          Upload CSV & generate forecast to see insights!
        </div>
      ) : (
        <table className="min-w-full text-gray-200 text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-300">
              <th className="py-2 px-4 text-left">Material</th>
              <th className="py-2 px-4">Forecast<br/>(Next Month)</th>
              <th className="py-2 px-4">Current<br/>Inventory</th>
              <th className="py-2 px-4">Supplier</th>
              <th className="py-2 px-4">Lead Time</th>
              <th className="py-2 px-4">Action</th>
            </tr>
          </thead>

          <tbody>
            {materials.map((m, i) => {
              const urgent = m.inventory < m.forecast;
              return (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30 transition">
                  <td className="py-2 px-4">{m.material}</td>
                  <td className="py-2 px-4 font-medium">{m.forecast} tons</td>
                  <td className="py-2 px-4">{m.inventory} tons</td>
                  <td className="py-2 px-4">{m.supplier || "—"}</td>
                  <td className="py-2 px-4">{m.leadTime || "-"} days</td>
                  <td className="py-2 px-4">
                    {urgent ? (
                      <span className="text-red-400 font-semibold">⚠️ Order Soon</span>
                    ) : (
                      <span className="text-green-400 font-semibold">✅ Sufficient</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {materials.length > 0 && (
        <div className="mt-3 bg-white/5 p-3 rounded-md text-xs text-gray-300">
          🤖 <b>AI Insight:</b> Items flagged “Order Soon” are predicted to fall short based on forecasted demand.
        </div>
      )}
    </div>
  );
};

export default MaterialTable;