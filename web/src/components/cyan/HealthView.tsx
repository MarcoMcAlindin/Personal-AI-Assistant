import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import { Menu, Sparkles } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";
import { healthService } from "../../services/healthService";

export function HealthView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    heartRate: 72,
    steps: 8432,
    water: 1.5,
    sleep: 7.2,
    hrv: 65
  });
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loading, setLoading] = useState(true);

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
    <div className={`${isMobile ? 'pt-16 pb-8' : 'pl-64'} min-h-screen`}>
      {!isMobile && <Sidebar />}
      <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
                <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                  Performance
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Health Hub
              </h1>
              <div className="text-[#BBC9CD] mt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00FFFF] animate-pulse"></span>
                Live Sync: Samsung Watch Ultra
              </div>
            </div>

            {isMobile && (
              <button
                onClick={() => setMenuOpen(true)}
                className="p-3 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors border border-[#00FFFF]/20"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
          </div>
        </header>

        <div className="space-y-6 max-w-2xl">
          {/* AI Analysis Section */}
          <GlassCard className="!p-8 border-[#00FFFF]/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#00FFFF]/10">
                <Sparkles className="w-6 h-6 text-[#00FFFF]" />
              </div>
              <h2 className="text-2xl font-semibold text-white">AI Health Analysis</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-[#0A0A0A]/50 rounded-lg p-4 border border-[#00FFFF]/10">
                <h3 className="text-white font-semibold mb-2">Detailed Report</h3>
                <p className="text-[#BBC9CD] text-sm leading-relaxed">
                  {loading ? 'Synthesizing biometric data...' : aiAnalysis}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Sleep Tracking */}
          <GlassCard className="!p-8">
            <h2 className="text-2xl font-semibold text-white mb-8">Sleep Tracking</h2>
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-5xl font-bold text-white mb-2">{stats.sleep}h</div>
                <div className="text-[#BBC9CD] text-lg">Total Sleep</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#BBC9CD] text-base">Progress</span>
                  <span className="text-white font-semibold text-base">{Math.round((stats.sleep / 8) * 100)}%</span>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FFFF] rounded-full" style={{ width: `${Math.min((stats.sleep / 8) * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Heart Rate / HRV */}
          <GlassCard className="!p-8">
            <h2 className="text-2xl font-semibold text-white mb-8">Heart Rate & HRV</h2>
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-5xl font-bold text-white mb-2">{stats.heartRate} bpm</div>
                <div className="text-[#BBC9CD] text-lg">Average Focus</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white mb-2">{stats.hrv} ms</div>
                <div className="text-[#BBC9CD] text-lg">Heart Rate Variability</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#BBC9CD] text-base">HR Zone</span>
                  <span className="text-white font-semibold text-base">{stats.heartRate} bpm</span>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FFFF] rounded-full" style={{ width: `${Math.min((stats.heartRate / 180) * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Step Count */}
          <GlassCard className="!p-8">
            <h2 className="text-2xl font-semibold text-white mb-8">Activity</h2>
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-5xl font-bold text-white mb-2">{stats.steps.toLocaleString()}</div>
                <div className="text-[#BBC9CD] text-lg">Steps Today</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#BBC9CD] text-base">Goal Progress</span>
                  <span className="text-white font-semibold text-base">{Math.round((stats.steps / 10000) * 100)}%</span>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FFFF] rounded-full" style={{ width: `${Math.min((stats.steps / 10000) * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Water Intake */}
          <GlassCard className="!p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-white">Water Intake</h2>
              <button 
                className="px-4 py-2 rounded-xl bg-[#00FFFF]/20 text-[#00FFFF] font-semibold hover:bg-[#00FFFF] hover:text-black transition-all"
                onClick={() => setStats(s => ({ ...s, water: Math.min(3, s.water + 0.25) }))}
              >
                + 250ml
              </button>
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-5xl font-bold text-white mb-2">{stats.water.toFixed(2)} L</div>
                <div className="text-[#BBC9CD] text-lg">Today's Hydration</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#BBC9CD] text-base">Daily Goal</span>
                  <span className="text-white font-semibold text-base">3.0 L</span>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FFFF] rounded-full" style={{ width: `${Math.min((stats.water / 3) * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}