import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LiquidEther from '../components/LiquidEther';
import { FaUpload, FaChartLine, FaClipboardList, FaCogs, FaCloudSun, FaDownload } from 'react-icons/fa';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CSVUpload = () => {
  const { projId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (projId) {
      localStorage.setItem("currentProjectId", projId);
      console.log("✅ Project ID stored:", projId);
    }
  }, [projId]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filename, setFilename] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [formData, setFormData] = useState({
    projectName: '',
    projectType: '',
    location: '',
    startDate: '',
    endDate: '',
    material: '',
    otherMaterial: '',
    horizon_months: 6,
    lead_time_days: 10,
    current_inventory: 0,
    supplierReliability: '',
    deliveryTimeDays: '',
    contractorTeamSize: '',
    projectBudget: '',
    weather: '',
    region_risk: '',
    notes: '',
    buildingAddress: '',
    rainPossibility: '',
  });

  const saveProjectDetails = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const currentId = localStorage.getItem("currentProjectId");
    if (!currentId) {
      console.warn("❌ No currentProjectId in localStorage");
      return;
    }

    const ref = doc(db, "users", user.uid, "projects", currentId);
    await setDoc(ref, { ...formData, uploadedCsvFileName: filename || null }, { merge: true });

    console.log("✅ Project details saved to Firestore");
  };

  useEffect(() => {
    const savedFilename = localStorage.getItem("uploadedFilename");
    const savedFileName = localStorage.getItem("uploadedFileName");

    if (savedFilename) setFilename(savedFilename);
    if (savedFileName) setUploadedFile({ name: savedFileName });
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(Boolean);
      setCsvPreview(rows.slice(0, 6).map(r => r.split(',')));
      localStorage.setItem("csvPreview", JSON.stringify(rows.slice(0, 6).map(r => r.split(','))));
    };
    reader.readAsText(file);

    const data = new FormData();
    data.append("file", file);

    try {
      setLoading(true);
      const res = await axios.post('http://127.0.0.1:8000/upload-data', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadedFile(file);
      setFilename(res.data.filename);

      localStorage.setItem("uploadedFilename", res.data.filename);
      localStorage.setItem("uploadedFileName", file.name);
    } catch (err) {
      console.error("❌ File upload failed:", err);
      alert("Upload failed, try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedPreview = localStorage.getItem("csvPreview");
    if (savedPreview) setCsvPreview(JSON.parse(savedPreview));
  }, []);

  const handleGenerateForecast = async () => {
    const currentId = localStorage.getItem("currentProjectId");

   if (!filename || !formData.materials || formData.materials.length === 0) {
  alert("Upload CSV & add at least one material first!");
  return;
}

    try {
      setLoading(true);
      const forecastData = new FormData();
     Object.entries(formData).forEach(([key, value]) => {
  if (key !== "materials") {
    forecastData.append(key, value);
  }
});
      forecastData.append("filename", filename);
     // ✅ Attach materials list as JSON
      forecastData.append("materials", JSON.stringify(formData.materials || []));

      const res = await axios.post('http://127.0.0.1:8000/recommendation', forecastData, {headers: {"Content-Type": "multipart/form-data" }});

      console.log("✅ Forecast result:", res.data);
      await saveProjectDetails();

      navigate(`/dashboard/${projId}`, { state: { forecast: res.data } });

      localStorage.removeItem("uploadedFilename");
    } catch (err) {
      console.error("❌ Forecast failed:", err);
      alert("Forecast failed!");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: "Project Overview", icon: <FaClipboardList /> },
    { id: 2, title: "Upload Historical Data", icon: <FaUpload /> },
    { id: 3, title: "Material & Inventory Details", icon: <FaCogs /> },
    { id: 4, title: "Location", icon: <FaCloudSun /> },
    { id: 5, title: "Generate Forecast", icon: <FaChartLine /> },
  ];

  const csvTemplate = [
    ["date", "material", "quantity_used"],
    ["2025-01-01", "Cement", "10"],
    ["2025-01-02", "Steel", "5"]
  ];

  const downloadCSVTemplate = () => {
    const csvContent = csvTemplate.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "csv_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
const handleInputChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));
};

const addMaterial = () => {
  const materialName =
    formData.tempMaterial === "Other" ? formData.tempOtherMaterial : formData.tempMaterial;

  const newMaterial = {
    material: materialName,
    horizon_months: formData.tempHorizon,
    lead_time_days: formData.tempLeadTime,
    current_inventory: formData.tempInventory,
    supplierReliability: formData.tempSupplier,
    deliveryTimeDays: formData.tempDelivery,
    contractorTeamSize: formData.tempTeam,
    projectBudget: formData.tempBudget
  };

  setFormData({
    ...formData,
    materials: [...(formData.materials || []), newMaterial],
    tempMaterial: "",
    tempOtherMaterial: "",
    tempHorizon: "",
    tempLeadTime: "",
    tempInventory: "",
    tempSupplier: "",
    tempDelivery: "",
    tempTeam: "",
    tempBudget: ""
  });
};

const removeMaterial = (index) => {
  const updated = [...formData.materials];
  updated.splice(index, 1);
  setFormData({ ...formData, materials: updated });
};

// ✅ Auto-fetch coordinates & weather when location fields change
useEffect(() => {
  if (!formData.localArea && !formData.city) return;

  const timer = setTimeout(async () => {
    try {
      const geoKey = process.env.REACT_APP_OPENCAGE_KEY;
      const fullLocation = `${formData.buildingAddress || ''}, ${formData.localArea || ''}, ${formData.city || ''}, ${formData.state || ''}, ${formData.pincode || ''}`;
      const geoRes = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(fullLocation)}&key=${geoKey}`
      );

      const geometry = geoRes.data.results[0]?.geometry;
      if (geometry) {
        const lat = geometry.lat;
        const lon = geometry.lng;

        const formattedAddress = geoRes.data.results[0]?.formatted || '';
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon,
          formattedAddress: formattedAddress
        }));

        // Fetch weather
        const weatherKey = process.env.REACT_APP_OPENWEATHER_KEY;
        const weatherRes = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric`
        );

        const data = weatherRes.data;
        const current = data.current || {};
        const daily = data.daily?.[0] || {};
        setFormData((prev) => ({
          ...prev,
          weather: data.weather[0].description,
          temperature: data.main.temp,
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          rainPossibility: daily.pop ? (daily.pop * 100).toFixed(1) : '0',
        }));
      } else {
        console.warn("❌ Could not fetch coordinates. Check city name.");
      }
    } catch (error) {
      console.error("Geo/Weather fetch failed:", error);
    }
  }, 800); // Debounce: waits 800ms after last input change

  return () => clearTimeout(timer);
}, [formData.localArea, formData.city, formData.state, formData.pincode]);

  return (
    <div className="relative w-full min-h-screen overflow-hidden text-gray-200">
      <LiquidEther
        colors={['#5C3AFF', '#A883FF', '#52FF99']}
        mouseForce={25}
        cursorSize={70}
        viscous={40}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -10 }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <header className="text-center py-16 px-6">
          <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#5C3AFF] to-[#A883FF] mb-4">
            Project Data & Forecast Setup
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Fill all relevant details, upload historical data, and let AI predict your material needs 🚀
          </p>
        </header>

        <div className="flex justify-center mb-10 space-x-4">
          {steps.map((s) => (
            <div
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full border cursor-pointer transition
                ${step === s.id ? 'bg-gradient-to-r from-[#5C3AFF] to-[#A883FF] text-white border-transparent' : 'bg-gray-800/70 border-gray-600'}`}
            >
              {s.icon} <span className="hidden sm:inline">{s.title}</span>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 mb-16 shadow-[0_0_40px_5px_rgba(92,58,255,0.4)]">
          {/* Step 1: Project Overview */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Current Project Overview</h2>
              <p className="mb-4 text-gray-300">Fill in details about this project.</p>
              <div className="grid gap-4">
                <input name="projectName" placeholder="Project Name" value={formData.projectName} onChange={handleInputChange} className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]" />
                <input name="location" placeholder="Location" value={formData.location} onChange={handleInputChange} className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]" />
                <select name="projectType" value={formData.projectType} onChange={handleInputChange} className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]">
                  <option value="">Select Project Type</option>
                  <option>Building</option>
                  <option>Bridge</option>
                  <option>Road</option>
                  <option>Tunnel</option>
                  <option>Pipeline</option>
                </select>
                <div className="flex gap-4">
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="flex-1 p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]" />
                  <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="flex-1 p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]" />
                </div>
              </div>
            </div>
          )}

         {/* Step 2: Upload Historical Data */}
         
{step === 2 && (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Upload Historical Material Data</h2>
    <p className="text-gray-300 mb-2">
      Fill in the details in the Excel template, then export/save as CSV before uploading. Example template available below.
    </p>
    <button
      onClick={() => window.open('/templates/PrediChain_HistoricalData_Template.xlsx', '_blank')}
      className="mb-3 px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
    >
      <FaDownload /> Download Excel Template
    </button>
   {!uploadedFile && !filename ? (
  <>
    <input
      type="file"
      accept=".csv"
      onChange={handleFileUpload}
      className="block w-full text-sm text-gray-300 bg-gray-800/60 border border-gray-600 rounded-lg cursor-pointer focus:ring-2 focus:ring-[#5C3AFF]"
    />
    <p className="mt-3 text-yellow-400">⚠️ No file uploaded yet.</p>
  </>
) : (
  <div className="flex items-center justify-between mt-3 bg-gray-800/50 p-3 rounded-lg">
    <p className="text-green-400">
      ✅ File uploaded: <span className="font-semibold">{uploadedFile ? uploadedFile.name : filename}</span>
    </p>
    <button
      onClick={() => {
        setUploadedFile(null);
        setFilename('');
        localStorage.removeItem("uploadedFilename");
        localStorage.removeItem("uploadedFileName");
        localStorage.removeItem("csvPreview");
      }}
      className="text-red-400 hover:text-red-500"
    >
      Remove
    </button>
  </div>
)}
    {csvPreview.length > 0 && (
      <div className="mt-4 text-gray-200">
        <p className="mb-2 font-semibold">Preview (first 5 rows):</p>
        <table className="w-full text-sm border border-gray-600">
          <tbody>
            {csvPreview.map((row, i) => (
              <tr key={i} className={i === 0 ? 'font-bold bg-gray-700' : ''}>
                {row.map((cell, j) => (
                  <td key={j} className="border px-2 py-1">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
          

       {/* ✅ Step 3: Materials & Inventory Details */}
{step === 3 && (
  <div>
    <h2 className="text-2xl font-semibold mb-4 text-white">Materials & Inventory</h2>
    <p className="text-gray-300 mb-4">
      Add all materials required for this project.
    </p>

    {/* 🧾 Form to Add a Material */}
    <div className="grid gap-4 bg-gray-800/40 p-4 rounded-xl border border-gray-700">

      {/* Material */}
      <select
        name="tempMaterial"
        value={formData.tempMaterial || ""}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-indigo-500 text-white"
      >
        <option value="">Select Material</option>
        <option>Cement</option>
        <option>Steel</option>
        <option>Asphalt</option>
        <option>Sand</option>
        <option>Bricks</option>
        <option>Aggregate</option>
        <option value="Other">Other</option>
      </select>

      {/* Other Material field */}
      {formData.tempMaterial === "Other" && (
        <input
          type="text"
          name="tempOtherMaterial"
          placeholder="Specify other material"
          value={formData.tempOtherMaterial || ""}
          onChange={handleInputChange}
          className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 text-white focus:ring-2 focus:ring-indigo-500"
        />
      )}

      {/* Forecast */}
      <input
        type="number"
        name="tempHorizon"
        placeholder="Forecast Horizon (months)"
        value={formData.tempHorizon || ""}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 text-white"
      />

      {/* Lead Time */}
      <input
        type="number"
        name="tempLeadTime"
        placeholder="Lead Time (days)"
        value={formData.tempLeadTime || ""}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 text-white"
      />

      {/* Inventory */}
      <input
        type="number"
        name="tempInventory"
        placeholder="Current Inventory (tons)"
        value={formData.tempInventory || ""}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 text-white"
      />

      {/* Supplier Reliability */}
      <input
        type="number"
        name="tempSupplier"
        placeholder="Supplier reliability (%)"
        value={formData.tempSupplier || ""}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 text-white"
      />

      {/* Delivery time */}
      <input
        type="number"
        name="tempDelivery"
        placeholder="Avg delivery time (days)"
        value={formData.tempDelivery || ""}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 text-white"
      />

      {/* Team size */}
      <input
        type="number"
        name="tempTeam"
        placeholder="Contractor team size"
        value={formData.tempTeam || ""}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 text-white"
      />

      {/* Budget */}
      <input
        type="number"
        name="tempBudget"
        placeholder="Material budget (INR)"
        value={formData.tempBudget || ""}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 text-white"
      />

      {/* ➕ ADD Button */}
      <button
        onClick={addMaterial}
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg"
      >
        ➕ Add Material
      </button>
    </div>

    {/* 📋 Table of Added Materials */}
    {formData.materials && formData.materials.length > 0 && (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2 text-white">Added Materials</h3>

        <table className="w-full text-left border border-gray-700 text-white">
          <thead>
            <tr className="bg-gray-900/80">
              <th className="p-2 border border-gray-700">Material</th>
              <th className="p-2 border border-gray-700">Inventory</th>
              <th className="p-2 border border-gray-700">Reliability</th>
              <th className="p-2 border border-gray-700">Budget</th>
              <th className="p-2 border border-gray-700">Action</th>
            </tr>
          </thead>

          <tbody>
            {formData.materials.map((m, i) => (
              <tr key={i} className="border-b border-gray-700">
                <td className="p-2">{m.material}</td>
                <td className="p-2">{m.current_inventory}</td>
                <td className="p-2">{m.supplierReliability}%</td>
                <td className="p-2">₹{m.projectBudget}</td>
                <td className="p-2">
                  <button
                    onClick={() => removeMaterial(i)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ❌
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

          {/* Step 4: Location & Weather */}
{step === 4 && (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Location & Weather Insights</h2>
    <p className="text-gray-300 mb-3">
      Enter your project location — PrediChain will automatically fetch coordinates & weather data.
    </p>

    <div className="grid gap-4">
      {/* Location Inputs */}
      <input
      type="text"
      name="buildingAddress"
      placeholder="Building / Land Address "
      value={formData.buildingAddress}
      className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
      onChange={async (e) => {
        const value = e.target.value;
        setFormData({ ...formData, buildingAddress: value });
      }}
      />
      <input
        name="localArea"
        placeholder="Local Area / Locality"
        value={formData.localArea || ''}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
      />
      <input
        name="city"
        placeholder="City"
        value={formData.city || ''}
        onChange={handleInputChange}
        onBlur={async () => {
          if (!formData.city) return;
          try {
            setLoading(true);
            const geoKey = process.env.REACT_APP_OPENCAGE_KEY;
            const fullLocation = `${formData.buildingAddress || ''}, ${formData.localArea || ''}, ${formData.city || ''}, ${formData.state || ''}, ${formData.pincode || ''}`;
            const geoRes = await axios.get(
              `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(fullLocation)}&key=${geoKey}`
            );

            const geometry = geoRes.data.results[0]?.geometry;
            const formattedAddress = geoRes.data.results[0]?.formatted || "Address not found";
            if (geometry) {
              const lat = geometry.lat;
              const lon = geometry.lng;

              setFormData((prev) => ({
                ...prev,
                latitude: lat,
                longitude: lon,
                formattedAddress: formattedAddress
              }));

              // 🔁 Fetch weather automatically using OpenWeather
              const weatherKey = process.env.REACT_APP_OPENWEATHER_KEY;
              const weatherRes = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric`
              );

              const data = weatherRes.data;
              setFormData((prev) => ({
                ...prev,
                weather: data.weather[0].description,
                temperature: data.main.temp,
                humidity: data.main.humidity,
                windSpeed: data.wind.speed,
              }));
            } else {
              alert("❌ Could not fetch coordinates. Please check city name.");
            }
          } catch (error) {
            console.error(error);
            alert("Error fetching coordinates or weather data.");
          } finally {
            setLoading(false);
          }
        }}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
      />

      <input
        name="state"
        placeholder="State"
        value={formData.state || ''}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
      />

      <input
        name="pincode"
        placeholder="Pincode (if applicable)"
        value={formData.pincode || ''}
        onChange={handleInputChange}
        className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
      />

      {/* Show Geo & Weather */}
      {(formData.latitude && formData.longitude) && (
        <div className="bg-gray-800/60 p-4 rounded-lg text-gray-200">
          <p><b>Latitude:</b> {formData.latitude}</p>
          <p><b>Longitude:</b> {formData.longitude}</p>
        </div>
      )}

      {formData.weather && (
        <div className="bg-gray-800/60 p-4 rounded-lg text-gray-200">
          <p><b>Condition:</b> {formData.weather}</p>
          <p><b>Temperature:</b> {formData.temperature} °C</p>
          <p><b>Humidity:</b> {formData.humidity}%</p>
          <p><b>Wind Speed:</b> {formData.windSpeed} m/s</p>
          <p><b>Rain Possibility:</b> {formData.rainPossibility}%</p>
        </div>
      )}
    </div>
  </div>
)}

         {/* Step 5: Generate Forecast */}
              {step === 5 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Review & Generate Forecast</h2>
                  <p className="text-gray-300 mb-4">Check your data before generating AI-powered predictions.</p>

                 <div className="bg-gray-800/50 p-4 rounded-lg mb-6 text-sm text-gray-200 space-y-2">

  {/* ✅ Project Info */}
  <p><b>Project Name:</b> {formData.projectName}</p>
  <p><b>Project Type:</b> {formData.projectType}</p>
  <p><b>Start Date:</b> {formData.startDate}</p>
  <p><b>End Date:</b> {formData.endDate}</p>

  {/* ✅ Location Info */}
  <p className="mt-2 font-semibold text-indigo-300">📍 Location Details</p>
  <p><b>Address:</b> {formData.buildingAddress || "—"}</p>
  <p><b>Area:</b> {formData.localArea || "—"}</p>
  <p><b>City:</b> {formData.city || "—"}</p>
  <p><b>State:</b> {formData.state || "—"}</p>
  <p><b>Pincode:</b> {formData.pincode || "—"}</p>
  <p><b>Latitude:</b> {formData.latitude || "—"}</p>
  <p><b>Longitude:</b> {formData.longitude || "—"}</p>
  <p><b>Formatted Address:</b> {formData.formattedAddress || "—"}</p>

  {/* ✅ Weather Info */}
  {formData.weather && (
    <>
      <p className="mt-2 font-semibold text-blue-300">🌤 Weather Insights</p>
      <p><b>Condition:</b> {formData.weather}</p>
      <p><b>Temperature:</b> {formData.temperature} °C</p>
      <p><b>Humidity:</b> {formData.humidity}%</p>
      <p><b>Wind Speed:</b> {formData.windSpeed} m/s</p>
      <p><b>Rain Possibility:</b> {formData.rainPossibility || "—"}%</p>
    </>
  )}

  {/* ✅ Materials Section */}
  <p className="mt-2 font-semibold text-green-300">🧱 Materials & Inventory</p>

  {formData.materials && formData.materials.length > 0 ? (
    <ul className="list-disc ml-6 space-y-1">
      {formData.materials.map((m, i) => (
        <li key={i}>
          <b>{m.material}</b>  
          <br/>Forecast Horizon: {m.horizon_months} months  
          <br/>Lead Time: {m.lead_time_days} days  
          <br/>Inventory: {m.current_inventory} units  
          <br/>Supplier Reliability: {m.supplierReliability}%  
          <br/>Avg Delivery Time: {m.deliveryTimeDays} days  
          <br/>Team Size: {m.contractorTeamSize}  
          <br/>Budget: ₹{m.projectBudget}  
        </li>
      ))}
    </ul>
  ) : (
    <p>— No materials added</p>
  )}

  {/* ✅ Notes & CSV */}
  <p className="mt-2"><b>Notes:</b> {formData.notes || "—"}</p>
  <p><b>CSV File:</b> {uploadedFile ? uploadedFile.name : (filename || "No file uploaded")}</p>

</div>
                  <button
                    disabled={loading}
                    onClick={handleGenerateForecast}
                    className="px-8 py-3 rounded-full bg-gradient-to-r from-[#5C3AFF] to-[#A883FF] text-white font-semibold hover:scale-105 transition"
                  >
                    {loading ? "Generating..." : "Generate Forecast"}
                  </button>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1}
                  className="px-6 py-2 rounded-full bg-gray-700/60 text-white hover:bg-gray-600 transition disabled:opacity-30"
                >
                  Prev
                </button>
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={step === steps.length}
                  className="px-6 py-2 rounded-full bg-gradient-to-r from-[#5C3AFF] to-[#A883FF] hover:scale-105 transition disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <Footer />
        </div>
  );
};

export default CSVUpload;