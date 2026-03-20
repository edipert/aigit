import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Activity, GitMerge, Settings, BrainCircuit } from 'lucide-react';
import DashboardPage from './pages/Dashboard';
import ConflictsPage from './pages/Conflicts';

const Sidebar = () => (
  <nav className="sidebar animate-fade-in">
    <div className="brand">
      <BrainCircuit size={28} color="var(--brand-primary)" />
      <span>Aigit Context</span>
    </div>
    
    <div className="nav-links mt-8" style={{ marginTop: '2rem' }}>
      <NavLink to="/stats" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
        <Activity size={20} />
        Platform Stats
      </NavLink>
      <NavLink to="/conflicts" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
        <GitMerge size={20} />
        Conflict Resolution
      </NavLink>
    </div>
    
    <div style={{ flex: 1 }} />
    
    <div className="nav-links">
      <a href="#" className="nav-link" onClick={(e) => e.preventDefault()}>
        <Settings size={20} />
        Settings
      </a>
    </div>
  </nav>
);

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/stats" element={<DashboardPage />} />
            <Route path="/conflicts" element={<ConflictsPage />} />
            <Route path="*" element={<Navigate to="/stats" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
