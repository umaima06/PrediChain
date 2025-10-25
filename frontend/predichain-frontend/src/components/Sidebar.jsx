import React from 'react';
import { FaProjectDiagram, FaChartLine, FaWarehouse, FaCog, FaUsers } from 'react-icons/fa';

const links = [
  { name: 'Projects', icon: <FaProjectDiagram /> },
  { name: 'Dashboard', icon: <FaChartLine /> },
  { name: 'Forecasts', icon: <FaChartLine /> },
  { name: 'Inventory', icon: <FaWarehouse /> },
  { name: 'Analytics', icon: <FaUsers /> },
  { name: 'Settings', icon: <FaCog /> }
];

const Sidebar = () => (
  <div className="w-64 bg-gray-900 text-white h-screen p-6 flex flex-col justify-between neon-glow">
    <div>
      <h1 className="text-2xl font-bold mb-10">PrediChain</h1>
      {links.map((link) => (
        <div key={link.name} className="flex items-center gap-3 p-2 hover:bg-[#5C3AFF]/30 rounded-lg cursor-pointer mb-2">
          {link.icon} <span>{link.name}</span>
        </div>
      ))}
    </div>
    <div className="text-sm text-gray-400">v1.0 | Dark Neon</div>
  </div>
);

export default Sidebar;