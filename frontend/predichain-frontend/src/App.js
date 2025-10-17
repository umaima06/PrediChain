import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Auth from './pages/Auth';
import ProjectManagement from './pages/ProjectManagement';
import './index.css';
import './components/LiquidEther.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />      {/* Landing page */}
        <Route path="/login" element={<Auth />} /> {/* Login/Signup page */}
        <Route path="/projects" element={<ProjectManagement />} />
      </Routes>
    </Router>
  );
}

export default App;