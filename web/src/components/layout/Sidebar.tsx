import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <aside className={`vibe-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="logo-icon">
              <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
            </svg>
          </div>
          {!collapsed && (
            <div className="brand-info">
              <span className="brand-name">VibeOS</span>
              <span className="brand-tagline">Personal Command Center</span>
            </div>
          )}
        </div>

        <nav className="nav-section">
          <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="AI Chat">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {!collapsed && <span>AI Chat</span>}
          </NavLink>
          <NavLink to="/feeds" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Tech Feed">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            {!collapsed && <span>Tech Feed</span>}
          </NavLink>
          <NavLink to="/concerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Concerts">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
            {!collapsed && <span>Concerts</span>}
          </NavLink>
          <NavLink to="/email" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Email">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            {!collapsed && <span>Email</span>}
          </NavLink>
          <NavLink to="/health" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Health">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
            </svg>
            {!collapsed && <span>Health</span>}
          </NavLink>
          <NavLink to="/planner" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Planner">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {!collapsed && <span>Planner</span>}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="footer-actions">
            <button
              className="nav-item"
              onClick={() => setShowSettings(true)}
              title="Settings"
              style={{ background: 'none', width: '100%', cursor: 'pointer' }}
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              {!collapsed && <span>Settings</span>}
            </button>
            <button
              className="nav-item"
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ background: 'none', width: '100%', cursor: 'pointer' }}
            >
              <svg
                className="nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
              >
                <polyline points="11 17 6 12 11 7"></polyline>
                <polyline points="18 17 13 12 18 7"></polyline>
              </svg>
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>

          {!collapsed && (
            <div className="status-indicator">
              <div className="status-item">
                <span className="dot"></span>
                Cloud Run: Active
              </div>
              <div className="status-item">
                <span className="dot"></span>
                Supabase: Connected
              </div>
            </div>
          )}
        </div>
      </aside>

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2>Settings</h2>
              <button className="settings-close" onClick={() => setShowSettings(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="settings-body">
              <div className="settings-section">
                <h3>Appearance</h3>
                <div className="settings-row">
                  <span>Theme</span>
                  <span className="settings-value">OLED Dark</span>
                </div>
                <div className="settings-row">
                  <span>Accent Color</span>
                  <span className="settings-value accent-chip">Neon Cyan</span>
                </div>
              </div>
              <div className="settings-section">
                <h3>Connections</h3>
                <div className="settings-row">
                  <span>Supabase</span>
                  <span className="settings-value online">Connected</span>
                </div>
                <div className="settings-row">
                  <span>Cloud Run Gateway</span>
                  <span className="settings-value online">Active</span>
                </div>
                <div className="settings-row">
                  <span>DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT</span>
                  <span className="settings-value pending">Pending Deploy</span>
                </div>
              </div>
              <div className="settings-section">
                <h3>AI Memory</h3>
                <div className="settings-row">
                  <span>RAG Window</span>
                  <span className="settings-value">10 days</span>
                </div>
                <div className="settings-row">
                  <span>Context Mode</span>
                  <span className="settings-value">pgvector semantic search</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
