import React, { useEffect, useState } from 'react';

const ThemeToggle = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.setAttribute('data-theme', 'light');
  }, [darkMode]);

  return (
    <button onClick={() => setDarkMode(!darkMode)} className="px-2 py-1 rounded border border-primary">
      {darkMode ? '🌙' : '☀️'}
    </button>
  );
};

export default ThemeToggle;
