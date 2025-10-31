import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Swal from "sweetalert2";
import axios from "axios";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const FullMap = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      const projectRef = doc(db, "projects", projectId);
      const snap = await getDoc(projectRef);
      if (snap.exists()) setProject(snap.data());
    };
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (!project?.latitude || !project?.longitude) return;

    const map = L.map("fullMap").setView([project.latitude, project.longitude], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.marker([project.latitude, project.longitude]).addTo(map);

    // 🌦️ Fetch weather
    const fetchWeather = async () => {
      const API_KEY = "YOUR_OPENWEATHER_API_KEY";
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${project.latitude}&lon=${project.longitude}&appid=${API_KEY}&units=metric`;

      const res = await axios.get(url);
      const weather = res.data.weather[0].main;
      const temp = res.data.main.temp;

      // ⚡ Smart alert based on project phase
      if (project.phase?.toLowerCase().includes("slab") && (weather === "Rain" || weather === "Clouds")) {
        Swal.fire({
          icon: "warning",
          title: "Weather Alert 🌧️",
          text: `It's currently ${weather.toLowerCase()} (${temp}°C). Avoid slab work today!`,
          confirmButtonColor: "#6C63FF",
        });
      } else {
        Swal.fire({
          icon: "info",
          title: "Weather Looks Good ☀️",
          text: `Current weather: ${weather} (${temp}°C). Proceed with your project.`,
          confirmButtonColor: "#00C851",
        });
      }
    };

    fetchWeather();

    return () => map.remove();
  }, [project]);

  return (
    <div className="h-screen w-full">
      <div id="fullMap" className="h-full w-full"></div>
    </div>
  );
};

export default FullMap;
