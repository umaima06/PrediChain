import React from "react";

const FeatureImportancePanel = ({ featureImportance }) => {
  if (!featureImportance || Object.keys(featureImportance).length === 0) return null;

  const formatted =
    Array.isArray(featureImportance)
      ? featureImportance
      : Object.entries(featureImportance).map(([feature, val]) => ({
          feature,
          importance: Number(val) / 100,
        }));

  const neonColors = [
    "from-cyan-400 to-blue-500",
    "from-pink-500 to-purple-500",
    "from-green-400 to-emerald-500",
    "from-orange-400 to-yellow-500",
    "from-sky-400 to-indigo-500",
    "from-rose-400 to-fuchsia-500",
  ];

  return (
    <div className="mt-10 relative rounded-3xl border border-violet-500/40 bg-gradient-to-br from-[#1b103a] via-[#1e1b4b] to-[#0f172a] shadow-[0_0_25px_rgba(147,51,234,0.35)] p-8 overflow-hidden group">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.25),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.25),transparent_70%)] animate-pulse-slow opacity-70 blur-xl"></div>

      {/* Header */}
      <div className="relative mb-6 z-10">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 flex items-center gap-2">
          ⚡ AI Insights — Feature Importance
        </h2>
        <p className="text-gray-300 mb-6 text-base text-center font-medium">
  These factors have the biggest impact on demand forecasting for your project.
</p>
      </div>

      {/* Cards Grid */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
        {formatted.map((f, idx) => {
          const percent = (f.importance * 100).toFixed(1);
          const color = neonColors[idx % neonColors.length];

          return (
            <div
              key={idx}
              className={`relative bg-[#0f172a]/70 rounded-2xl p-5 border border-slate-700 hover:border-cyan-400/60 shadow-md hover:shadow-[0_0_14px_#22d3ee80] transition-all duration-300`}
            >
              {/* Mini top glow border */}
              <div
                className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${color} opacity-80`}
              ></div>

              {/* Content */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-100 font-semibold tracking-wide">
                  {f.feature}
                </span>
                <span className="text-cyan-300 font-bold text-lg">{percent}%</span>
              </div>

              {/* Gradient bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 bg-gradient-to-r ${color} rounded-full animate-pulse`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>

              {/* Bottom accent glow line */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${color} opacity-30 rounded-b-2xl`}
              ></div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
     <div className="relative mt-8 text-center text-gray-300 text-base italic font-medium z-10">
  💡 Higher value = stronger influence on forecasting accuracy
</div>

      {/* Outer glowing border */}
      <div className="absolute inset-0 rounded-3xl border border-cyan-400/10 hover:border-cyan-400/30 transition-all pointer-events-none"></div>

      {/* Slow pulse animation keyframe */}
      <style>
        {`
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.03); }
          }
          .animate-pulse-slow {
            animation: pulse-slow 6s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
};

export default FeatureImportancePanel;