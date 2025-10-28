import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filename, setFilename] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);
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
    notes: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate CSV columns
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(Boolean);
      if (rows.length < 1) return;

      // const headerCols = rows[0].split(',').map(h => h.trim().toLowerCase());
      // const requiredCols = ['date_of_materail_usage', 'material_name', 'quantity_used'];
      // const missingCols = requiredCols.filter(c => !headerCols.includes(c));
      const requiredCols = [
        'Date_of_Materail_Usage', 
        'Material_Name', 
        'Quantity_Used'
      ];
      
      // Convert CSV header to lowercase and trim for robust comparison
      const lowerHeaderCols = rows[0].split(',').map(h => h.trim().toLowerCase());
      const lowerRequiredCols = requiredCols.map(c => c.toLowerCase());
    
      // Check if the lowercase required columns are present
      const missingCols = lowerRequiredCols.filter(c => !lowerHeaderCols.includes(c));
        if (missingCols.length > 0) {
          const missingPascalCase = missingCols.map(
            missingLower => requiredCols.find(rc => rc.toLowerCase() === missingLower)
          );
          alert(`CSV missing required columns: ${missingCols.join(', ')}`);
          return;
        }

      // Show first 5 rows as preview
      setCsvPreview(rows.slice(0, 6).map(r => r.split(',')));
    };
    reader.readAsText(file);

    // Upload to backend
    const data = new FormData();
    data.append("file", file);

    try {
      setLoading(true);
      const res = await axios.post('http://127.0.0.1:8000/upload-data', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadedFile(file);
      setFilename(res.data.filename);
    } catch (err) {
      console.error("File upload failed:", err);
      alert("Upload failed, try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForecast = async () => {
    if (!filename || !formData.material) {
      alert("Please upload CSV and select material first!");
      return;
    }

    try {
      setLoading(true);
      const forecastData = new FormData();
      forecastData.append("filename", filename);
      forecastData.append("material", formData.material || formData.otherMaterial);
      forecastData.append("horizon_months", formData.horizon_months);
      forecastData.append("lead_time_days", formData.lead_time_days);
      forecastData.append("current_inventory", formData.current_inventory);
      forecastData.append("supplierReliability", formData.supplierReliability);
      forecastData.append("deliveryTimeDays", formData.deliveryTimeDays);
      forecastData.append("contractorTeamSize", formData.contractorTeamSize);
      forecastData.append("projectBudget", formData.projectBudget);
      forecastData.append("weather", formData.weather);
      forecastData.append("region_risk", formData.region_risk);
      forecastData.append("notes", formData.notes);
      forecastData.append("projectName", formData.projectName);
      forecastData.append("projectType", formData.projectType);
      forecastData.append("location", formData.location);
      forecastData.append("startDate", formData.startDate);
      forecastData.append("endDate", formData.endDate);

      const res = await axios.post('http://127.0.0.1:8000/recommendation', forecastData);
      console.log("Forecast result:", res.data);

      navigate(`/dashboard/${projId}`, { state: { forecast: res.data } });
    } catch (err) {
      console.error("Forecast generation failed:", err);
      alert("Forecast failed, check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: "Project Overview", icon: <FaClipboardList /> },
    { id: 2, title: "Upload Historical Data", icon: <FaUpload /> },
    { id: 3, title: "Material & Inventory Details", icon: <FaCogs /> },
    { id: 4, title: "Environmental Context", icon: <FaCloudSun /> },
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
    <input
      type="file"
      accept=".csv"
      onChange={handleFileUpload}
      className="block w-full text-sm text-gray-300 bg-gray-800/60 border border-gray-600 rounded-lg cursor-pointer focus:ring-2 focus:ring-[#5C3AFF]"
    />
    {uploadedFile && <p className="mt-3 text-green-400">✅ Uploaded: {uploadedFile.name}</p>}
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
          

          {/* Step 3: Material & Inventory Details */}
{step === 3 && (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Material & Inventory Details</h2>
    <p className="text-gray-300 mb-4">Provide material and inventory info for the current project. Each field has a short description to help you fill it correctly.</p>

    <div className="grid gap-4">

      {/* Material */}
      <div className="flex flex-col gap-1">
        <p className="text-gray-300 text-sm">Select the material you will use for this project.</p>
        <select
          name="material"
          value={formData.material}
          onChange={handleInputChange}
          className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
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
        {formData.material === "Other" && (
          <input
            type="text"
            name="otherMaterial"
            placeholder="Specify other material"
            value={formData.otherMaterial}
            onChange={handleInputChange}
            className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
          />
        )}
      </div>

      {/* Forecast Horizon */}
      <div className="flex flex-col gap-1">
        <p className="text-gray-300 text-sm">Number of months to forecast material usage for this project.</p>
        <input
          type="number"
          name="horizon_months"
          value={formData.horizon_months}
          onChange={handleInputChange}
          placeholder="Forecast Horizon (months)"
          className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
        />
      </div>

      {/* Lead Time */}
      <div className="flex flex-col gap-1">
        <p className="text-gray-300 text-sm">Average lead time in days to get this material delivered to your site.</p>
        <input
          type="number"
          name="lead_time_days"
          value={formData.lead_time_days}
          onChange={handleInputChange}
          placeholder="Lead Time (days)"
          className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
        />
      </div>

      {/* Current Inventory */}
      <div className="flex flex-col gap-1">
        <p className="text-gray-300 text-sm">Current inventory of this material on site (in tons).</p>
        <input
          type="number"
          name="current_inventory"
          value={formData.current_inventory}
          onChange={handleInputChange}
          placeholder="Current Inventory (tons)"
          className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
        />
      </div>

      {/* Supplier Reliability */}
      <div className="flex flex-col gap-1">
        <p className="text-gray-300 text-sm">Supplier reliability in percentage. Higher means consistent deliveries.</p>
        <input
          type="number"
          name="supplierReliability"
          value={formData.supplierReliability}
          onChange={handleInputChange}
          placeholder="Supplier reliability (%)"
          className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
        />
      </div>

      {/* Average Delivery Time */}
      <div className="flex flex-col gap-1">
        <p className="text-gray-300 text-sm">Average number of days it takes for this material to reach your site.</p>
        <input
          type="number"
          name="deliveryTimeDays"
          value={formData.deliveryTimeDays}
          onChange={handleInputChange}
          placeholder="Average delivery time (days)"
          className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
        />
      </div>

      {/* Contractor Team Size */}
      <div className="flex flex-col gap-1">
        <p className="text-gray-300 text-sm">Number of people in the contractor team for this project.</p>
        <input
          type="number"
          name="contractorTeamSize"
          value={formData.contractorTeamSize}
          onChange={handleInputChange}
          placeholder="Contractor team size"
          className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
        />
      </div>

      {/* Project Budget */}
      <div className="flex flex-col gap-1">
        <p className="text-gray-300 text-sm">Budget allocated for this project (USD).</p>
        <input
          type="number"
          name="projectBudget"
          value={formData.projectBudget}
          onChange={handleInputChange}
          placeholder="Project budget (USD)"
          className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]"
        />
      </div>

    </div>
  </div>
)}

          {/* Step 4: Environmental Context */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Environmental Context</h2>
              <p className="text-gray-300 mb-2">Current project conditions.</p>
              <div className="grid gap-4">
                <select name="weather" value={formData.weather} onChange={handleInputChange} className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]">
                  <option value="">Weather Condition</option>
                  <option>Sunny</option>
                  <option>Rainy</option>
                  <option>Humid</option>
                  <option>Mixed</option>
                </select>
                <select name="region_risk" value={formData.region_risk} onChange={handleInputChange} className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]">
                  <option value="">Region Risk Level</option>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
                <textarea name="notes" placeholder="Additional Notes / Context..." value={formData.notes} onChange={handleInputChange} className="p-3 rounded-lg bg-gray-900/60 border border-gray-600 focus:ring-2 focus:ring-[#5C3AFF]" />
              </div>
            </div>
          )}

         {/* Step 5: Generate Forecast */}
              {step === 5 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Review & Generate Forecast</h2>
                  <p className="text-gray-300 mb-4">Check your data before generating AI-powered predictions.</p>

                  <div className="bg-gray-800/50 p-4 rounded-lg mb-6 text-sm text-gray-200 space-y-2">
                    <p><b>Project:</b> {formData.projectName}</p>
                    <p><b>Type:</b> {formData.projectType} | <b>Location:</b> {formData.location}</p>
                    <p><b>Start → End:</b> {formData.startDate} → {formData.endDate}</p>
                    <p><b>Material:</b> {formData.material === 'Other' ? formData.otherMaterial : formData.material}</p>
                    <p><b>Forecast Horizon:</b> {formData.horizon_months} months</p>
                    <p><b>Lead Time:</b> {formData.lead_time_days} days | <b>Current Inventory:</b> {formData.current_inventory}</p>
                    <p><b>Supplier Reliability:</b> {formData.supplierReliability}% | <b>Delivery Time:</b> {formData.deliveryTimeDays} days</p>
                    <p><b>Contractor Team:</b> {formData.contractorTeamSize} | <b>Budget:</b> ${formData.projectBudget}</p>
                    <p><b>Weather:</b> {formData.weather} | <b>Region Risk:</b> {formData.region_risk}</p>
                    <p><b>Notes:</b> {formData.notes}</p>
                    {uploadedFile && <p><b>CSV:</b> {uploadedFile.name}</p>}
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