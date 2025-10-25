import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaExclamationCircle, FaTruck, FaShoppingCart } from "react-icons/fa";

const iconsMap = {
  "Order Now": <FaShoppingCart />,
  "Low Inventory": <FaExclamationCircle />,
  "Supplier Issues": <FaTruck />,
};

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
        formData.append("lead_time_days", projectData.lead_time_days);
        formData.append("current_inventory", projectData.current_inventory);
        formData.append("supplierReliability", projectData.supplierReliability);
        formData.append("deliveryTimeDays", projectData.deliveryTimeDays);
        formData.append("contractorTeamSize", projectData.contractorTeamSize);
        formData.append("projectBudget", projectData.projectBudget);
        formData.append("weather", projectData.weather);
        formData.append("region_risk", projectData.region_risk);
        formData.append("notes", projectData.notes);
        formData.append("projectName", projectData.projectName);

        const res = await axios.post("http://127.0.0.1:8000/recommendation", formData);
        const recommendations = res.data.recommendations;
        setRecs(recommendations);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      }
    };

    fetchRecs();
  }, [projectData]);

  return (
    <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4 rounded-xl shadow-lg text-white">
      <h3 className="text-lg font-bold mb-2">Recommendations</h3>
      {recs.length === 0 && <p>Loading recommendations...</p>}
      {recs.map((r, i) => (
        <div key={i} className="flex items-center gap-3 p-2 mb-2 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition">
          <div className="text-xl">{iconsMap[r.type]}</div>
          <div>
            <p className="font-medium">{r.message}</p>
            <p className="text-xs text-gray-200">{r.details}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendationPanel;