import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-8 py-4 flex justify-between items-center backdrop-blur-md bg-white/10 dark:bg-black/20 shadow-sm">
      {/* Logo */}
      <h1 className="text-2xl font-extrabold tracking-wide bg-gradient-to-r from-[#5227FF] to-[#B19EEF] bg-clip-text text-transparent">
        PrediChain
      </h1>

      {/* Nav Links */}
      <div className="flex gap-6 items-center text-sm font-medium">
        {/* Section links with smooth scroll */}
        <a href="#home" className="hover:text-[#B19EEF] transition">
          Home
        </a>
        <a href="#features" className="hover:text-[#B19EEF] transition">
          Features
        </a>
        <a href="#benefits" className="hover:text-[#B19EEF] transition">
          Benefits
        </a>

        {/* Auth buttons */}
        <Link
          to="/login"
          className="px-5 py-2 rounded-full bg-gradient-to-r from-[#5227FF] to-[#B19EEF] text-white font-semibold hover:scale-105 hover:shadow-lg transition"
        >
          Sign Up
        </Link>

        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </nav>
  );
};

export default Navbar;