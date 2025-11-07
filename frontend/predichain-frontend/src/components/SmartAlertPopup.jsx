import React, { useState } from "react";
import axios from "axios";

const SmartAlertPopup = ({ alertData, onClose }) => {
  const [recoveryData, setRecoveryData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", approx_cost: "", delay_days: "" });

  const handleRecoverySubmit = async () => {
    try {
      const project = JSON.parse(localStorage.getItem("projectDetails"));
      const payload = {
        project,
        loss_report: form,
        user: { email: project?.email || "site.manager@predichain.ai" }
      };
      const res = await axios.post("http://127.0.0.1:8000/recovery-smart-v3", payload);
      setRecoveryData(res.data);
    } catch (err) {
      console.error("❌ Recovery failed:", err);
    }
  };

  if (!alertData) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-md w-full text-white shadow-2xl">
        {!recoveryData ? (
          <>
            <h2 className="text-2xl font-bold mb-2">{alertData.risk_level} Risk Alert 🚨</h2>
            <p className="text-sm text-gray-300 mb-2">Confidence: {alertData.confidence * 100}%</p>
            <p className="mb-4">{alertData.alert_text}</p>

            {!showForm ? (
              <div className="flex justify-between">
                <button onClick={onClose} className="bg-green-500 px-4 py-2 rounded-lg">
                  I’ll take precautions
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-yellow-500 px-4 py-2 rounded-lg"
                >
                  What to do next?
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Damage description"
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Approx cost (₹)"
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                  onChange={e => setForm({ ...form, approx_cost: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Delay days"
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                  onChange={e => setForm({ ...form, delay_days: e.target.value })}
                />
                <button onClick={handleRecoverySubmit} className="bg-blue-600 px-4 py-2 rounded-lg">
                  Submit
                </button>
              </div>
            )}
          </>
        ) : (
          <div>
            <h3 className="text-xl font-bold mb-3">Recovery Plan 💡</h3>
            {Object.entries(recoveryData.tips).map(([section, tips]) => (
              <div key={section} className="mb-3">
                <h4 className="font-semibold text-indigo-400">{section}</h4>
                <ul className="list-disc ml-5 text-sm text-gray-300">
                  {tips.length > 0 ? tips.map((t, i) => <li key={i}>{t}</li>) : <li>—</li>}
                </ul>
              </div>
            ))}
            <button onClick={onClose} className="mt-3 bg-green-600 px-4 py-2 rounded-lg">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartAlertPopup;
