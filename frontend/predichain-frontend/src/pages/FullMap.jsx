import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const FullMap = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // ✅ Safe fallback so app never crashes
  const formData = state?.locationData || {};
  console.log("📍 Received Full Map Data:", formData)
  const fullAddress = `${formData.buildingAddress || ''}, ${formData.localArea || ''}, ${formData.city || ''}, ${formData.state || ''}, ${formData.pincode || ''}`;

  return (
    <div className="relative w-full h-screen flex flex-col">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-20 bg-gray-900/80 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
      >
        <ArrowLeft size={18} /> Back
      </button>

      {/* 🛰 Header with Location & Weather Info */}
      <div className="bg-gray-900/90 text-white p-4 text-center z-10 backdrop-blur-lg border-b border-gray-700">
        <h2 className="text-xl font-semibold">{formData.formattedAddress || "Project Location"}</h2>
        <div className="flex flex-wrap justify-center gap-6 mt-2 text-sm sm:text-base">
          {formData.latitude && formData.longitude && (
            <p>
              🌍 <strong>Lat:</strong> {formData.latitude.toFixed(4)} | <strong>Lon:</strong> {formData.longitude.toFixed(4)}
            </p>
          )}
          {formData.weather && (
            <p>☁️ <strong>Weather:</strong> {formData.weather}</p>
          )}
          {formData.temperature && (
            <p>🌡️ <strong>Temp:</strong> {formData.temperature}°C</p>
          )}
          {formData.humidity && (
            <p>💧 <strong>Humidity:</strong> {formData.humidity}%</p>
          )}
          {formData.windSpeed && (
            <p>🌬️ <strong>Wind:</strong> {formData.windSpeed} m/s</p>
          )}
          {formData.rainPossibility && (
            <p>🌧️ <strong>Rain Possibility</strong> {formData.rainPossibility} %</p>
          )}
        </div>
      </div>

      {/* 🗺️ Map below header */}
      <div className="flex-grow">
        <iframe
          title="Full Map View"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&z=18&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
        ></iframe>
      </div>
    </div>
  );
};

export default FullMap;
