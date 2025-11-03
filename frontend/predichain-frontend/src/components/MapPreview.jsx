// src/components/MapPreview.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const MapPreview = ({ formData }) => {
  const navigate = useNavigate();
  // const fullAddress = `${formData.buildingAddress || ''}, ${formData.localArea || ''}, ${formData.city || ''}, ${formData.state || ''}, ${formData.pincode || ''}`;

   // ✅ Add fallback in case formData is undefined
  const safeData = formData || {};
  const fullAddress = `${safeData.buildingAddress || ''}, ${safeData.localArea || ''}, ${safeData.city || ''}, ${safeData.state || ''}, ${safeData.pincode || ''}`;

  return (
    <div
      onClick={() => navigate("/full-map", { state: { formData: safeData } })}
      className="cursor-pointer transform hover:scale-105 transition duration-300"
    >
      <iframe
        title="Map Preview"
        width="100%"
        height="250"
        style={{ border: 0, borderRadius: "12px" }}
        loading="lazy"
        allowFullScreen
        src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&z=18&output=embed`}
      ></iframe>
      <p className="text-center mt-2 text-sm text-gray-400">
        📍 Click to view full map
      </p>
    </div>
  );
};

export default MapPreview;
