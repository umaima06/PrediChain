import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { auth } from '../firebase';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    setMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-8 py-4 flex justify-between items-center backdrop-blur-md bg-white/10 dark:bg-black/20 shadow-sm">
      <h1 className="text-2xl font-extrabold tracking-wide bg-gradient-to-r from-[#5227FF] to-[#B19EEF] bg-clip-text text-transparent">
        PrediChain
      </h1>

      <div className="flex gap-6 items-center text-sm font-medium">
        <a href="/" className="hover:text-[#B19EEF] transition">Home</a>
        <a href="#features" className="hover:text-[#B19EEF] transition">Features</a>
        <a href="#benefits" className="hover:text-[#B19EEF] transition">Benefits</a>
        
      {/* Show 'My Projects' link only if logged in */}
      {user && (
        <Link
          to="/projects"
          className="hover:text-[#B19EEF] transition"
        >
          My Projects
        </Link>
      )}

        {user ? (
          <div className="relative">
            {/* Profile button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-[#5227FF] to-[#B19EEF] text-white font-bold flex items-center justify-center"
            >
              {user.displayName
                ? user.displayName[0].toUpperCase()
                : user.email[0].toUpperCase()}
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-3">
                <div className="px-4 py-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {user.displayName || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>

                <hr className="my-2 border-gray-300 dark:border-gray-700" />

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 rounded-b-xl"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="px-5 py-2 rounded-full bg-gradient-to-r from-[#5227FF] to-[#B19EEF] text-white font-semibold hover:scale-105 hover:shadow-lg transition"
          >
            Sign Up
          </Link>
        )}

        <ThemeToggle />
      </div>
    </nav>
  );
};

export default Navbar;