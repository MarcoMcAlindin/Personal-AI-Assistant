import React, { useState, useEffect } from 'react';
import { healthService } from '../../services/healthService';
import './Health.css';

interface HealthStats {
  heartRate: number;
  steps: number;
  water: number;
  sleep: number;
  hrv: number;
}

const HealthHub: React.FC = () => {
  const [stats, setStats] = useState<HealthStats>({
    heartRate: 72,
    steps: 8432,
    water: 1.5,
    sleep: 7.2,
    hrv: 65
  });

  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const fetchData = async () => {
      const metrics = await healthService.getLatestMetrics();

      if (cancelled) return;

      if (metrics) {
        setStats(s => ({
          ...s,
          heartRate: metrics.avg_heart_rate,
          water: metrics.water_liters,
          sleep: metrics.sleep_duration,
        }));

        if (metrics.ai_analysis) {
          setAiAnalysis(metrics.ai_analysis);
          setLoading(false);
          return;
        }
      }

      // Fall through to demo state while VOS-027 is not yet live
      timer = setTimeout(() => {
        if (!cancelled) {
          setAiAnalysis('Your HRV is up 12% today, indicating excellent recovery. Optimal window for high-intensity training is between 10 AM and 1 PM. Hydration is slightly below baseline for this stage of the day.');
          setLoading(false);
        }
      }, 1500);
    };

    fetchData();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="health-container">
      <header className="health-header">
        <div className="title-group">
          <h1>Health & Intelligence</h1>
          <p className="text-muted">Biometric Performance Monitoring</p>
        </div>
        <div className="last-sync">
          <span className="dot pulse"></span>
          Live Sync: Samsung Watch Ultra
        </div>
      </header>

      <div className="health-grid">
        <div className="health-card main-metrics">
          <div className="metric-item">
            <span className="label">Heart Rate</span>
            <div className="value-group">
              <span className="value">{stats.heartRate}</span>
              <span className="unit">bpm</span>
            </div>
            <div className="progress-mini">
              <div className="fill" style={{ width: `${Math.min((stats.heartRate / 120) * 100, 100)}%` }}></div>
            </div>
          </div>
          <div className="metric-item">
            <span className="label">Activity</span>
            <div className="value-group">
              <span className="value">{stats.steps.toLocaleString()}</span>
              <span className="unit">Steps</span>
            </div>
            <div className="progress-mini">
              <div className="fill" style={{ width: '84%' }}></div>
            </div>
          </div>
          <div className="metric-item">
            <span className="label">Sleep Quality</span>
            <div className="value-group">
              <span className="value">{stats.sleep}</span>
              <span className="unit">Hours</span>
            </div>
            <div className="progress-mini">
              <div className="fill" style={{ width: '72%' }}></div>
            </div>
          </div>
          <div className="metric-item">
            <span className="label">Recovery (HRV)</span>
            <div className="value-group">
              <span className="value">{stats.hrv}</span>
              <span className="unit">ms</span>
            </div>
            <div className="progress-mini highlight">
              <div className="fill" style={{ width: '90%' }}></div>
            </div>
          </div>
        </div>

        <div className="health-card analysis-card">
          <div className="card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ai-icon">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <h3>AI Morning Audit</h3>
          </div>
          <div className="analysis-content">
            {loading ? (
              <div className="typing-indicator">Synthesizing biometric data...</div>
            ) : (
              <p className="analysis-text">{aiAnalysis}</p>
            )}
          </div>
          <button className="primary-btn" onClick={() => setShowReport(true)} disabled={loading}>
            Generate Full Report
          </button>
        </div>

        <div className="health-card hydration-card">
          <div className="card-header">
            <h3>Hydration</h3>
            <span className="stat-small">{stats.water}/3.0L</span>
          </div>
          <div className="hydration-visual">
            <div className="water-level" style={{ height: `${(stats.water / 3) * 100}%` }}></div>
          </div>
          <button className="secondary-btn" onClick={() => setStats(s => ({ ...s, water: Math.min(3, s.water + 0.25) }))}>
            Add 250ml
          </button>
        </div>
      </div>
      {showReport && (
        <div className="report-overlay" onClick={() => setShowReport(false)}>
          <div className="report-modal" onClick={e => e.stopPropagation()}>
            <div className="report-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ai-icon">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <h2>Full Biometric Report</h2>
              </div>
              <button className="report-close" onClick={() => setShowReport(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="report-body">
              <div className="report-metrics-grid">
                <div className="report-metric"><span className="report-label">Heart Rate</span><span className="report-val">{stats.heartRate} <small>bpm</small></span></div>
                <div className="report-metric"><span className="report-label">Activity</span><span className="report-val">{stats.steps.toLocaleString()} <small>steps</small></span></div>
                <div className="report-metric"><span className="report-label">Sleep</span><span className="report-val">{stats.sleep} <small>hrs</small></span></div>
                <div className="report-metric"><span className="report-label">HRV</span><span className="report-val">{stats.hrv} <small>ms</small></span></div>
                <div className="report-metric"><span className="report-label">Hydration</span><span className="report-val">{stats.water} <small>/ 3.0L</small></span></div>
              </div>
              <div className="report-analysis">
                <h4>AI Analysis</h4>
                <p>{aiAnalysis}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthHub;
