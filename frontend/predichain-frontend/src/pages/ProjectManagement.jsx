import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LiquidEther from '../components/LiquidEther';
import { FaPlus, FaMapMarkerAlt, FaProjectDiagram, FaTrash } from 'react-icons/fa';
import { getAuth } from 'firebase/auth';

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', location: '', type: '', startDate: '', endDate: '' });
  const [openCard, setOpenCard] = useState(null);
  const navigate = useNavigate();

  const statusColors = {
    Active: 'from-[#5C3AFF] to-[#A883FF]',
    Upcoming: 'from-[#52FF99] to-[#5C3AFF]',
    Completed: 'from-[#FFC700] to-[#FF7A00]',
  };

  useEffect(() => {
    const auth = getAuth(); // Get the Firebase Auth instance
    const user = auth.currentUser; // Get the currently logged-in user
    const fetchProjects = async () => {
      if (!user) {
        // User is not logged in, redirect to auth page
        navigate('/'); 
        return;
      }
      
      try {
        // Get the ID token for the backend
        const idToken = await user.getIdToken(); 

        // Fetch projects from backend, sending the token
        const res = await axios.get('http://127.0.0.1:8000/projects', {
          headers: {
            // CRUCIAL: Send the token in the Authorization header
            'Authorization': `Bearer ${idToken}` 
          }
        });
        setProjects(res.data);
      } catch (err) {
        console.error("Error fetching projects:", err);
        // Optional: Clear projects or show a specific error message
        }
      };
      
      fetchProjects();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // Add navigate as dependency
//   // Fetch projects from backend JSON
//   axios.get('http://127.0.0.1:8000/projects')
//   .then(res => setProjects(res.data))
//   .catch(err => console.error("Error fetching projects:", err));
// }, [];

  const handleInputChange = (e) => setNewProject({ ...newProject, [e.target.name]: e.target.value });

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProject.name || !newProject.type) return;

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return; // Should not happen if page is guarded

    try {
      const idToken = await user.getIdToken(); 
      const formData = new FormData();
      setProjects([...projects, res.data]);
      setNewProject({ name: '', location: '', type: '', startDate: '', endDate: '' });
      setShowForm(false);
      formData.append("name", newProject.name);
      formData.append("location", newProject.location);
      formData.append("type", newProject.type);
      formData.append("startDate", newProject.startDate);
      formData.append("endDate", newProject.endDate);
      formData.append("owner", "me");

      const res = await axios.post('http://127.0.0.1:8000/projects', formData, {
        headers: {
          'Authorization': `Bearer ${idToken}`, 
        }
      });
      setProjects([...projects, res.data]);
      setNewProject({ name: '', location: '', type: '', startDate: '', endDate: '' });
      setShowForm(false);
    } catch (err) {
      console.error("Error adding project:", err);
    }
  };

  const handleDeleteProject = async (projId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/projects/${projId}`);
      setProjects(projects.filter(p => p.id !== projId));
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const handleCSVRedirect = (projId) => {
    navigate(`/csv/${projId}`);
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <LiquidEther
        colors={['#5C3AFF', '#A883FF', '#52FF99']}
        mouseForce={20}
        cursorSize={60}
        isViscous={true}
        viscous={40}
        iterationsViscous={32}
        iterationsPoisson={32}
        resolution={0.7}
        isBounce={false}
        autoDemo={true}
        autoSpeed={0.5}
        autoIntensity={2.5}
        takeoverDuration={0.25}
        autoResumeDelay={3000}
        autoRampDuration={0.6}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -10 }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        {/* Header */}
        <header className="text-center py-16 px-6">
          <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#5C3AFF] to-[#A883FF] mb-4">
            Project Management
          </h1>
          <p className="text-lg text-gray-200 dark:text-gray-300 max-w-2xl mx-auto">
            Manage your projects, add new ones, and track status for smarter forecasting.
          </p>
        </header>

        {/* New Project Button */}
        <div className="flex justify-center mb-10">
          <button
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#5C3AFF] to-[#A883FF] text-white font-semibold rounded-full shadow-lg hover:scale-105 transition"
            onClick={() => setShowForm(!showForm)}
          >
            <FaPlus /> New Project
          </button>
        </div>

        {/* New Project Form */}
        {showForm && (
          <div className="max-w-3xl mx-auto bg-white/95 dark:bg-gray-900/95 p-8 rounded-2xl shadow-[0_0_40px_5px_rgba(92,58,255,0.5)] mb-12 backdrop-blur-lg transition-all border border-[#5C3AFF]/50">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Add New Project</h2>
            <form className="flex flex-col gap-4" onSubmit={handleAddProject}>
              <input type="text" name="name" placeholder="Project Name" value={newProject.name} onChange={handleInputChange} className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#5C3AFF] bg-gray-50 dark:bg-gray-700 dark:text-white"/>
              <input type="text" name="location" placeholder="Location" value={newProject.location} onChange={handleInputChange} className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#5C3AFF] bg-gray-50 dark:bg-gray-700 dark:text-white"/>
              <select name="type" value={newProject.type} onChange={handleInputChange} className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#5C3AFF] bg-gray-50 dark:bg-gray-700 dark:text-white">
                <option value="">Select Project Type</option>
                <option value="Road">Road</option>
                <option value="Bridge">Bridge</option>
                <option value="Building">Building</option>
                <option value="Tunnel">Tunnel</option>
              </select>
              <p className="text-gray-700 dark:text-gray-300 font-semibold">Project Duration</p>
              <div className="flex gap-4">
                <input type="date" name="startDate" value={newProject.startDate} onChange={handleInputChange} className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#5C3AFF] bg-gray-50 dark:bg-gray-700 dark:text-white flex-1"/>
                <input type="date" name="endDate" value={newProject.endDate} onChange={handleInputChange} className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#5C3AFF] bg-gray-50 dark:bg-gray-700 dark:text-white flex-1"/>
              </div>
              <button type="submit" className="mt-2 px-6 py-3 bg-gradient-to-r from-[#5C3AFF] to-[#A883FF] text-white font-semibold rounded-full hover:scale-105 transition">Add Project</button>
            </form>
          </div>
        )}

        {/* Project Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16 px-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className={`p-6 rounded-2xl shadow-lg backdrop-blur-lg border border-white/20 transition-transform hover:scale-105 hover:shadow-2xl cursor-pointer bg-gradient-to-r ${statusColors[proj.status] || "from-gray-700 to-gray-900 text-white"}`}
              onClick={() => setOpenCard(openCard === proj.id ? null : proj.id)}
            >
              <div className="flex items-center gap-3 mb-2">
                <FaProjectDiagram className="text-3xl" />
                <h3 className="text-xl font-semibold">{proj.name}</h3>
              </div>
              <p className="flex items-center gap-2 mb-1"><FaMapMarkerAlt /> {proj.location || 'N/A'}</p>
              <p className="mb-2">{proj.type}</p>
              <p className="text-sm">{proj.startDate} → {proj.endDate} | Status: {proj.status}</p>

              {openCard === proj.id && (
                <div className="mt-4 p-3 bg-white/10 dark:bg-black/30 rounded-lg border border-white/20 space-y-2">
                  <p><strong>ID:</strong> {proj.id}</p>
                  <p><strong>Status:</strong> {proj.status}</p>
                  <p><strong>Owner:</strong> {proj.owner}</p>
                  <p><strong>More details:</strong> Site updates, progress %, material logs, etc.</p>

                  <button
                    onClick={() => handleCSVRedirect(proj.id)}
                    className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-[#5C3AFF] to-[#A883FF] text-white rounded-lg hover:scale-105 transition"
                  >
                    Upload CSV
                  </button>

                  {proj.owner === 'me' && (
                    <button
                      onClick={() => handleDeleteProject(proj.id)}
                      className="w-full mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      Delete Project
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default ProjectManagement;