import React, { useEffect, useState } from "react";
import axios from "axios";

const RecommendationPanel = ({ recommendationsData: dashboardRecs }) => {
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    if (!dashboardRecs?.length) return;
    setRecs(dashboardRecs);
  }, [dashboardRecs]);

  if (!recs.length) return <p className="text-white">Loading recommendations...</p>;

  return (
    <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4 rounded-xl shadow-lg text-white">
      <h3 className="text-lg font-bold mb-2">Procurement Recommendations</h3>
      <ul>
        {recs.map((r, idx) => (
          <li key={idx} className="mb-2 p-2 bg-white/10 rounded">
            <p>{r.material}: Order <b>{r.recommended_order_quantity}</b></p>
            <p>📅 {new Date(r.recommended_order_date).toLocaleDateString()}</p>
            <p className="text-sm text-gray-200">Demand: {r.forecasted_demand}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecommendationPanel;