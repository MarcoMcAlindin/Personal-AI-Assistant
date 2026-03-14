import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import ChatInterface from './components/Chat/ChatInterface';
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
        <div className="app-container">
          <main style={{ padding: 'var(--spacing-md)', maxWidth: '1200px', margin: '0 auto' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<ChatInterface />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
