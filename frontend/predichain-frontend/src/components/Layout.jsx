// frontend/predichain-frontend/src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { FaProjectDiagram, FaTachometerAlt, FaChartLine, FaBoxes, FaChartPie, FaCog, FaBell, FaUserCircle } from 'react-icons/fa';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const sidebarLinks = [
  { name: "Projects", icon: <FaProjectDiagram /> },
  { name: "Dashboard", icon: <FaTachometerAlt /> },
  { name: "Forecasts", icon: <FaChartLine /> },
  { name: "Inventory", icon: <FaBoxes /> },
  { name: "Analytics", icon: <FaChartPie /> },
  { name: "Settings", icon: <FaCog /> },
];

const Layout = ({ children, projectName = "PrediChain Project", projectStatus = "Active" }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Fetch notifications for current user
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (!auth.currentUser) return;
        const notifRef = collection(db, "notifications");
        const q = query(notifRef, where("uid", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const notifData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(notifData);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Optionally redirect to login
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">

      {/* Sidebar */}
      <aside className={`bg-gray-900 border-r border-gray-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h1 className={`font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-[#5C3AFF] to-[#A883FF] ${sidebarOpen ? '' : 'hidden'}`}>
            PrediChain
          </h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white">
            {sidebarOpen ? "«" : "»"}
          </button>
        </div>

        <nav className="flex-1 mt-4">
          {sidebarLinks.map((link) => (
            <a
              key={link.name}
              href="#"
              className="flex items-center gap-3 p-3 mx-2 my-1 rounded-lg hover:bg-gray-800 transition"
            >
              <span className="text-lg">{link.icon}</span>
              {sidebarOpen && <span>{link.name}</span>}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">

        {/* Topbar */}
        <header className="flex justify-between items-center bg-gray-800/70 backdrop-blur-md border-b border-gray-700 px-6 py-3 shadow-lg">
          
          {/* Project Info */}
          <div>
            <p className="text-gray-300 text-sm">Current Project:</p>
            <h2 className="font-bold text-white text-lg">{projectName} <span className="text-green-400 text-sm">({projectStatus})</span></h2>
          </div>

          {/* User + Notifications */}
          <div className="flex items-center gap-4 relative">

            {/* Notifications */}
            <button className="relative text-gray-300 hover:text-white">
              <FaBell size={20} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* User Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 bg-gray-700 p-1 rounded-full hover:ring-2 ring-[#5C3AFF]"
              >
                <FaUserCircle size={28} className="text-gray-300" />
                <span className="hidden sm:block text-gray-200 font-medium">{auth.currentUser?.displayName || "Z"}</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => alert("Profile page not implemented yet")}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>

      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-80 text-center">
            <h2 className="text-xl font-bold mb-4 text-white">Confirm Logout?</h2>
            <p className="text-gray-300 mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-around">
              <button
                onClick={handleLogout}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition"
              >
                Logout
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Layout;