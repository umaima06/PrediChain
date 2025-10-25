import React from "react";

const MetricCard = ({ title, value, progress, gradientClass }) => {
  return (
    <div className={`${gradientClass} p-4 rounded-xl shadow-lg`}>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>
      {progress !== undefined && (
        <div className="h-2 bg-white/30 rounded-full mt-2">
          <div className="h-2 bg-white rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};

export default MetricCard;