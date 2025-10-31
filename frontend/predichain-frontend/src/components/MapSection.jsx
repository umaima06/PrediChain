import React from "react";

const MapSection = () => {
  return (
    <div className="bg-gradient-to-br from-[#0c1224] via-[#141b33] to-[#0b1220] p-5 rounded-xl shadow-[0_0_25px_4px_rgba(125,92,255,0.25)] mt-8 h-80 flex flex-col items-center justify-center text-gray-300">
      <h2 className="text-lg font-semibold mb-2">🗺️ Site Risk Heat Map</h2>
      <p className="text-xs text-gray-400 mb-3">
        Future feature: Visualizing material risk zones & supply hotspots
      </p>

      <div className="border border-gray-700/60 rounded-lg w-full h-full flex items-center justify-center text-gray-500 text-sm bg-gray-800/30">
        Map Placeholder (GeoHeatMap Loading Soon...)
      </div>
    </div>
  );
};

export default MapSection;