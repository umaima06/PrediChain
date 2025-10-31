import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MapPreview = ({ latitude, longitude, onClick }) => {
  useEffect(() => {
    if (!latitude || !longitude) return;

    const map = L.map("mapPreview").setView([latitude, longitude], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.marker([latitude, longitude]).addTo(map);

    return () => map.remove();
  }, [latitude, longitude]);

  return (
    <div
      id="mapPreview"
      className="h-64 rounded-xl shadow-lg cursor-pointer"
      onClick={onClick}
    ></div>
  );
};

export default MapPreview;
