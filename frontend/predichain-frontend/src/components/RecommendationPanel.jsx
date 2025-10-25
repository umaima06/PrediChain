import React, { useEffect, useState } from "react";
import axios from "axios";

const RecommendationPanel = ({ projectData }) => {
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    if (!projectData) return;

    const fetchRecs = async () => {
      try {
        const formData = new FormData();
        formData.append("filename", projectData.csvFilename);
        formData.append("material", projectData.material);
        formData.append("horizon_months", projectData.horizon_months);
        formData.append("lead_time_days", projectData.lead_time_days || 10);
        formData.append("current_inventory", projectData.current_inventory || 0);
        formData.append("supplierReliability", projectData.supplierReliability || 100);
        formData.append("deliveryTimeDays", projectData.deliveryTimeDays || 0);
        formData.append("contractorTeamSize", projectData.contractorTeamSize || 0);
        formData.append("projectBudget", projectData.projectBudget || 0);
        formData.append("weather", projectData.weather || "");
        formData.append("region_risk", projectData.region_risk || "");
        formData.append("notes", projectData.notes || "");
        formData.append("projectName", projectData.projectName || "");
        formData.append("projectType", projectData.projectType || "");
        formData.append("location", projectData.location || "");
        formData.append("startDate", projectData.startDate || "");
        formData.append("endDate", projectData.endDate || "");

        const res = await axios.post("http://127.0.0.1:8000/recommendation", formData);
        setRecs(res.data.recommendations);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      }
    };

    fetchRecs();
  }, [projectData]);

  if (!recs.length) return <p className="text-white">Loading recommendations...</p>;

  return (
    <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4 rounded-xl shadow-lg text-white">
      <h3 className="text-lg font-bold mb-2">Procurement Recommendations</h3>
      <ul>
        {recs.map((r, idx) => (
          <li key={idx} className="mb-2 p-2 bg-white/10 rounded">
            <p>{r.material}: Order <b>{r.recommended_order_quantity}</b> units by <b>{new Date(r.recommended_order_date).toLocaleDateString()}</b></p>
            <p className="text-sm text-gray-200">Forecasted demand: {r.forecasted_demand}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecommendationPanel;