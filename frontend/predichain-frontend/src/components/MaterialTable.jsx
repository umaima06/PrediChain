import React from "react";

const MaterialTable = ({ materials }) => {
  return (
    <div className="bg-gray-900/70 p-4 rounded-xl shadow-[0_0_30px_5px_rgba(92,58,255,0.3)] mt-6 overflow-x-auto">
      <h2 className="text-gray-200 font-semibold mb-2">Project Materials</h2>
      <table className="min-w-full text-gray-200">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="py-2 px-4 text-left">Material</th>
            <th className="py-2 px-4">Forecast Next Month</th>
            <th className="py-2 px-4">Current Inventory</th>
            <th className="py-2 px-4">Supplier</th>
            <th className="py-2 px-4">Lead Time</th>
            <th className="py-2 px-4">Action</th>
          </tr>
        </thead>
        <tbody>
          {materials?.map((m, i) => (
            <tr key={i} className="border-b border-gray-700">
              <td className="py-2 px-4">{m.material}</td>
              <td className="py-2 px-4">{m.forecast} tons</td>
              <td className="py-2 px-4">{m.inventory} tons</td>
              <td className="py-2 px-4">{m.supplier}</td>
              <td className="py-2 px-4">{m.leadTime} days</td>
              <td className="py-2 px-4">{m.action === "urgent" ? "⚠️ Order now" : "✅ OK"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MaterialTable;