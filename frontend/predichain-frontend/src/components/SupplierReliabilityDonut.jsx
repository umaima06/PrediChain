import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const SupplierReliabilityDonut = ({ supplierName, reliability }) => {
  const targetScore = Math.min(Math.max(reliability || 0, 0), 100);
  const [animatedScore, setAnimatedScore] = useState(0);

  // 🎞️ Smooth animation on mount
  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.floor(targetScore / 40)); // smoother step
    const interval = setInterval(() => {
      current += step;
      if (current >= targetScore) {
        current = targetScore;
        clearInterval(interval);
      }
      setAnimatedScore(current);
    }, 30);
    return () => clearInterval(interval);
  }, [targetScore]);

  const getColor = (val) => {
    if (val >= 90) return "#22c55e"; // green
    if (val >= 70) return "#facc15"; // yellow
    return "#ef4444"; // red
  };

  const data = [
    { name: "Reliability", value: animatedScore },
    { name: "Remaining", value: 100 - animatedScore },
  ];

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-4 rounded-2xl shadow-md hover:scale-[1.03] transition-all duration-300 ${
        animatedScore >= 90
          ? "bg-gradient-to-br from-green-900/40 to-gray-900"
          : animatedScore >= 70
          ? "bg-gradient-to-br from-yellow-900/40 to-gray-900"
          : "bg-gradient-to-br from-red-900/40 to-gray-900"
      }`}
    >
      <h3 className="text-md font-semibold text-gray-200 mb-2 text-center">
        {supplierName || "Unknown Supplier"}
      </h3>

      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            innerRadius={55}
            outerRadius={75}
            cornerRadius={8}
            stroke="none"
            isAnimationActive={false} // handled manually
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? getColor(animatedScore) : "#1f2937"}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active }) =>
              active ? (
                <div className="bg-gray-800 text-white p-2 rounded text-sm shadow-lg">
                  <p>Reliability: {animatedScore.toFixed(0)}%</p>
                  <p>
                    Status:{" "}
                    {animatedScore >= 90
                      ? "Reliable"
                      : animatedScore >= 70
                      ? "Moderate"
                      : "Critical"}
                  </p>
                </div>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 🔢 Animated Score Text */}
      <div className="absolute text-center pointer-events-none">
        <p
          className={`text-3xl font-bold ${
            animatedScore >= 90
              ? "text-green-400"
              : animatedScore >= 70
              ? "text-yellow-300"
              : "text-red-400"
          } ${animatedScore >= 90 ? "animate-pulse" : ""}`}
        >
          {animatedScore.toFixed(0)}%
        </p>
        <p className="text-sm text-gray-400">
          {animatedScore >= 90
            ? "Reliable"
            : animatedScore >= 70
            ? "Moderate"
            : "Critical"}
        </p>
      </div>
    </div>
  );
};

export default SupplierReliabilityDonut;
