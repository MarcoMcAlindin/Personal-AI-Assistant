import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import ChatInterface from './components/Chat/ChatInterface';
import HealthHub from './components/health/index';
import FeedsHub from './components/feeds/index';
import EmailHub from './components/email/index';
import PlannerHub from './components/planner/index';
import './index.css';

const App = (): JSX.Element => {
  return (
    <ThemeProvider>
      <Router>
        <div className="app-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
          <Sidebar />

          <main style={{ flex: 1, padding: 'var(--spacing-lg)', maxWidth: '1400px', margin: '0 auto', overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
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
