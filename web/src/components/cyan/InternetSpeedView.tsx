import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Wifi, Download, Upload, Activity } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

export function InternetSpeedView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);

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
                  Internet Speed
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Connection Status
              </h1>
              <p className="text-[#BBC9CD] mt-1">Monitor your network performance</p>
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

        <GlassCard className="mb-8 text-center !p-8">
          <div className="p-4 rounded-full bg-green-500/10 inline-flex mb-4">
            <Wifi className="w-12 h-12 text-green-400" />
          </div>
          <div className="text-5xl font-bold text-green-400 mb-2">450 Mbps</div>
          <div className="text-[#BBC9CD]">Excellent Connection</div>
        </GlassCard>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <GlassCard className="!p-6">
            <div className="p-3 rounded-lg bg-[#00FFFF]/10 inline-flex mb-3">
              <Download className="w-6 h-6 text-[#00FFFF]" />
            </div>
            <div className="text-3xl font-bold text-[#00FFFF] mb-1">428</div>
            <div className="text-sm text-[#BBC9CD]">Download (Mbps)</div>
          </GlassCard>

          <GlassCard className="!p-6">
            <div className="p-3 rounded-lg bg-purple-500/10 inline-flex mb-3">
              <Upload className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-purple-400 mb-1">382</div>
            <div className="text-sm text-[#BBC9CD]">Upload (Mbps)</div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="!p-4">
            <div className="text-sm text-[#BBC9CD] mb-1">Latency</div>
            <div className="text-2xl font-bold text-green-400">12ms</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="text-sm text-[#BBC9CD] mb-1">Jitter</div>
            <div className="text-2xl font-bold text-green-400">2ms</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="text-sm text-[#BBC9CD] mb-1">Packet Loss</div>
            <div className="text-2xl font-bold text-green-400">0%</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="text-sm text-[#BBC9CD] mb-1">Uptime</div>
            <div className="text-2xl font-bold text-[#00FFFF]">99.9%</div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
