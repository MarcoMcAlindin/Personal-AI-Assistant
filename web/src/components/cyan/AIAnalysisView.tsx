import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Brain, Upload, BarChart3 } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

export function AIAnalysisView() {
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
                  AI Functions
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Data Analysis
              </h1>
              <p className="text-[#BBC9CD] mt-1">AI-powered data analysis and insights</p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard className="!p-6">
            <div className="p-3 rounded-lg bg-[#00FFFF]/10 inline-flex mb-4">
              <Brain className="w-6 h-6 text-[#00FFFF]" />
            </div>
            <div className="text-2xl font-bold text-[#00FFFF] mb-1">AI Model</div>
            <p className="text-sm text-[#BBC9CD]">GPT-4 Advanced</p>
          </GlassCard>

          <GlassCard className="!p-6">
            <div className="p-3 rounded-lg bg-purple-500/10 inline-flex mb-4">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400 mb-1">1,247</div>
            <p className="text-sm text-[#BBC9CD]">Analyses Today</p>
          </GlassCard>

          <GlassCard className="!p-6">
            <div className="p-3 rounded-lg bg-green-500/10 inline-flex mb-4">
              <Upload className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400 mb-1">98.2%</div>
            <p className="text-sm text-[#BBC9CD]">Accuracy Rate</p>
          </GlassCard>
        </div>

        <GlassCard>
          <h2 className="text-xl font-bold text-[#DAE2FD] mb-6">Upload Data for Analysis</h2>
          <div className="border-2 border-dashed border-[#00FFFF]/30 rounded-xl p-12 text-center hover:border-[#00FFFF]/50 transition-colors cursor-pointer">
            <Upload className="w-12 h-12 text-[#00FFFF] mx-auto mb-4" />
            <p className="text-[#DAE2FD] font-semibold mb-2">Drop files here or click to upload</p>
            <p className="text-sm text-[#BBC9CD]">Supports CSV, JSON, Excel files up to 50MB</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
