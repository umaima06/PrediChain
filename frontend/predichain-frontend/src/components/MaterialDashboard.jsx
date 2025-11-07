import React, { useMemo } from "react";

const MaterialDashboard = ({ materials = [], bulkOrders = [] }) => {
  const aggregated = useMemo(() => {
    const map = {};
    const bulkMap = {};

    // Group bulk orders by material
    bulkOrders.forEach((b) => {
      const mat = b.material || "Unknown";
      if (!bulkMap[mat]) bulkMap[mat] = [];
      bulkMap[mat].push(b);
    });

    materials.forEach((item) => {
      const mat = item.material || "Unknown";
      const forecast = Number(item.forecasted_demand ?? item.forecast ?? 0);
      const historical = Number(item.historical_total ?? 0);
      const inventory = Number(item.current_inventory ?? 0);
      const supplierReliability = Number(item.supplierReliability ?? 100);
      const leadTime = Number(item.leadTime ?? 0);

      if (!map[mat]) {
        map[mat] = {
          material: mat,
          forecast,
          historicalTotal: historical,
          inventory,
          supplier: item.supplier || "N/A",
          supplierReliability,
          leadTime,
          recommendedOrder: 0,
          recommendedOrderDate: null,
          action: "ok",
          bulkGroup: null,
        };
      }

      // recommended order base logic
      let recommendedOrder = 0;
      if (bulkMap[mat]?.length > 0) {
        recommendedOrder = bulkMap[mat].reduce(
          (sum, b) => sum + (b.recommended_order_quantity ?? 0),
          0
        );
      } else {
        const bufferFactor = 0.25;
        const reliabilityFactor = supplierReliability / 100;
        const adjustedBuffer = bufferFactor / reliabilityFactor;
        recommendedOrder = Math.max(
          0,
          forecast * (1 + adjustedBuffer) - inventory
        );
      }

      const today = new Date();
      const orderDate = new Date(today);
      orderDate.setDate(today.getDate() + leadTime);

      map[mat].recommendedOrder = Math.round(recommendedOrder);
      map[mat].recommendedOrderDate = orderDate.toISOString().split("T")[0];

      // urgency level
      if (inventory < forecast * 0.5) map[mat].action = "critical";
      else if (inventory < forecast * 0.9) map[mat].action = "urgent";
      else map[mat].action = "ok";
    });

    // 🎯 Bulk Optimization: group materials by similar lead time + supplier reliability
    const all = Object.values(map);
    const bulkGroups = [];

    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const leadDiff = Math.abs(a.leadTime - b.leadTime);
        const relDiff = Math.abs(a.supplierReliability - b.supplierReliability);

        if (leadDiff <= 3 && relDiff <= 10) {
          const groupName = `${a.material} + ${b.material}`;
          const totalQty = a.recommendedOrder + b.recommendedOrder;
          const avgReliability = Math.round(
            (a.supplierReliability + b.supplierReliability) / 2
          );
          const avgLead = Math.round((a.leadTime + b.leadTime) / 2);

          bulkGroups.push({
            groupName,
            totalQty,
            avgReliability,
            avgLead,
            costSavings: (totalQty * 0.05).toFixed(2), // assume 5% savings for bulk
          });

          a.bulkGroup = groupName;
          b.bulkGroup = groupName;
        }
      }
    }

    return { materials: all, bulkGroups };
  }, [materials, bulkOrders]);

  const { materials: processed, bulkGroups } = aggregated;

  if (processed.length === 0)
    return (
      <div className="text-gray-400 text-sm p-4 bg-gray-800/40 rounded-lg">
        No materials data yet 👀 Upload CSV & generate forecast to see insights!
      </div>
    );

  return (
    <div className="bg-gradient-to-br from-[#0c1224] via-[#141b33] to-[#0b1220] p-6 rounded-xl shadow-[0_0_25px_4px_rgba(125,92,255,0.25)] mt-8 overflow-x-auto">
      <h2 className="text-gray-100 font-bold text-xl mb-4">
        📦 Material Demand & Optimization Dashboard
      </h2>

      {/* Main Table */}
      <table className="min-w-full text-gray-200 text-sm border border-gray-700 rounded-lg overflow-hidden">
        <thead className="bg-gray-800/60 text-gray-300">
          <tr>
            <th className="py-2 px-4 text-left">Material</th>
            <th className="py-2 px-4">Historical Used</th>
            <th className="py-2 px-4">Forecast (Next)</th>
            <th className="py-2 px-4">Current Inventory</th>
            <th className="py-2 px-4">Supplier (Reliability)</th>
            <th className="py-2 px-4">Lead Time</th>
            <th className="py-2 px-4">Recommended Order</th>
            <th className="py-2 px-4">Order By</th>
            <th className="py-2 px-4">Action</th>
          </tr>
        </thead>
        <tbody>
          {processed.map((m, i) => (
            <tr
              key={i}
              className={`${
                m.action === "critical"
                  ? "bg-red-900/30"
                  : m.action === "urgent"
                  ? "bg-yellow-900/30"
                  : "bg-green-900/20"
              } border-b border-gray-800 hover:bg-gray-800/40 transition`}
            >
              <td className="py-2 px-4 font-semibold">
                {m.material}
                {m.bulkGroup && (
                  <div className="text-xs text-gray-400">
                    🔗 In Bulk: {m.bulkGroup}
                  </div>
                )}
              </td>
              <td className="py-2 px-4">{m.historicalTotal.toLocaleString()} t</td>
              <td className="py-2 px-4">{m.forecast.toLocaleString()} t</td>
              <td className="py-2 px-4">{m.inventory.toLocaleString()} t</td>
              <td className="py-2 px-4">
                {m.supplier} ({m.supplierReliability}%)
              </td>
              <td className="py-2 px-4">{m.leadTime} days</td>
              <td className="py-2 px-4 font-semibold text-yellow-300">
                {m.recommendedOrder.toLocaleString()} t
              </td>
              <td className="py-2 px-4">{m.recommendedOrderDate}</td>
              <td className="py-2 px-4">
                {m.action === "critical" ? (
                  <span className="text-red-400 font-semibold">🔥 Critical</span>
                ) : m.action === "urgent" ? (
                  <span className="text-orange-400 font-semibold">⚠️ Urgent</span>
                ) : (
                  <span className="text-green-400 font-semibold">✅ Stable</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🧩 Bulk Order Optimization */}
      {bulkGroups.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-100 mb-2">
            💡 Bulk Order Opportunities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bulkGroups.map((g, i) => (
              <div
                key={i}
                className="bg-gray-800/70 p-4 rounded-lg border border-gray-700"
              >
                <p className="font-semibold text-yellow-300">{g.groupName}</p>
                <p>Total Combined Quantity: {g.totalQty.toLocaleString()} tons</p>
                <p>Avg Lead Time: {g.avgLead} days</p>
                <p>Avg Reliability: {g.avgReliability}%</p>
                <p className="text-green-400">
                  💰 Estimated Cost Savings: ₹{g.costSavings}k
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🧠 AI Insights */}
      <div className="mt-6 p-5 bg-yellow-900/25 text-yellow-100 rounded-lg font-semibold shadow-inner">
        🤖 <b>AI Insight:</b> Orders are dynamically adjusted considering forecast,
        reliability, and lead times. Bulk orders across similar materials unlock up
        to <b>5–10% cost savings</b> while reducing stockout risks. The system also
        auto-schedules reorder dates to ensure uninterrupted supply.
      </div>
    </div>
  );
};

export default MaterialDashboard;