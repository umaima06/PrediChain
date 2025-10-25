import React from 'react';
import { FaBell, FaUserCircle } from 'react-icons/fa';

const Topbar = ({ projectName }) => (
  <div className="h-16 bg-gray-800 text-white flex items-center justify-between px-6 neon-glow">
    <div className="font-bold text-lg">{projectName || 'Current Project'}</div>
    <div className="flex items-center gap-4">
      <FaBell className="text-xl cursor-pointer" />
      <div className="flex items-center gap-2 cursor-pointer">
        <FaUserCircle className="text-2xl" />
        <span>BSF User</span>
      </div>
    </div>
  </div>
);

export default Topbar;