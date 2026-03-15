import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import ChatInterface from './components/Chat/ChatInterface';
import HealthHub from './components/health';
import FeedsHub from './components/feeds';
import EmailHub from './components/email';
import PlannerHub from './components/planner';
import { Link } from 'react-router-dom';
import './index.css';

// Placeholder Pages
const Dashboard = () => (
  <div className="card">
    <h1>Dashboard</h1>
    <p>Welcome to VibeOS.</p>
  </div>
);

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
          <nav className="sidebar" style={{ width: '240px', borderRight: '1px solid var(--border-color)', padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <h2 className="text-accent">VibeOS</h2>
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/chat" className="nav-link">AI Assistant</Link>
            <Link to="/health" className="nav-link">Health Hub</Link>
            <Link to="/feeds" className="nav-link">Vibe Feeds</Link>
            <Link to="/email" className="nav-link">Email</Link>
            <Link to="/planner" className="nav-link">Planner</Link>
          </nav>

          <main style={{ flex: 1, padding: 'var(--spacing-lg)', maxWidth: '1400px', margin: '0 auto', overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<ChatInterface />} />
              <Route path="/health" element={<HealthHub />} />
              <Route path="/feeds" element={<FeedsHub />} />
              <Route path="/email" element={<EmailHub />} />
              <Route path="/planner" element={<PlannerHub />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
