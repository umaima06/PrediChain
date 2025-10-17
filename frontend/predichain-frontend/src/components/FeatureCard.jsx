import React from 'react';

const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl dark:shadow-blue-900/50 p-6 rounded-2xl flex flex-col items-center text-center
                    hover:scale-105 hover:shadow-2xl transition-transform duration-300 backdrop-blur-sm">
      
      {/* Icon */}
      <div className="text-5xl mb-4 text-blue-600 dark:text-teal-400">{icon}</div>

      {/* Title */}
      <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>

      {/* Description */}
      <p className="text-gray-700 dark:text-gray-200 text-center">{description}</p>
    </div>
  );
};

export default FeatureCard;