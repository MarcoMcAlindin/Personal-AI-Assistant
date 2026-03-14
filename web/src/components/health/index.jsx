import React, { useState, useEffect } from 'react';

const HealthHub = () => {
    const [stats, setStats] = useState({
        heartRate: 72,
        steps: 8432,
        water: 1.5,
        sleep: 7.2
    });

    return (
        <div className="health-hub">
            <h1 className="text-accent">Health Hub</h1>
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                <div className="card">
                    <h3>Heart Rate</h3>
                    <p className="stat-value">{stats.heartRate} <span className="text-muted">BPM</span></p>
                </div>
                <div className="card">
                    <h3>Activity</h3>
                    <p className="stat-value">{stats.steps} <span className="text-muted">Steps</span></p>
                </div>
                <div className="card">
                    <h3>Hydration</h3>
                    <p className="stat-value">{stats.water} <span className="text-muted">Liters</span></p>
                    <button className="send-btn" onClick={() => setStats(s => ({...s, water: s.water + 0.25}))}>+250ml</button>
                </div>
                <div className="card">
                    <h3>Sleep</h3>
                    <p className="stat-value">{stats.sleep} <span className="text-muted">Hours</span></p>
                </div>
            </div>
            
            <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
                <h3>AI Health Analysis</h3>
                <p className="text-muted">Analyzing your recent metrics against the 10-day RAG window...</p>
                <div className="typing-indicator">Syncing with Samsung Health Connect...</div>
            </div>
        </div>
    );
};

export default HealthHub;
