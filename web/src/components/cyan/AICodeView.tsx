import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Code, Play } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

export function AICodeView() {
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
                <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-transparent rounded-full"></div>
                <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                  Code Assistant
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                AI Code Helper
              </h1>
              <p className="text-[#BBC9CD] mt-1">Get AI-powered coding assistance</p>
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

        {/* Code Editor */}
        <GlassCard className="!p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Code className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-[#DAE2FD]">Code Playground</h3>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2">
              <Play className="w-4 h-4" />
              Run
            </button>
          </div>
          <textarea
            className="w-full h-64 bg-[#0D0D12] text-[#DAE2FD] px-4 py-3 rounded-lg border border-purple-500/20 focus:border-purple-500/40 focus:outline-none font-mono text-sm"
            placeholder="// Write your code here..."
          />
        </GlassCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Explain Code", desc: "Get code explanations" },
            { label: "Find Bugs", desc: "Identify issues" },
            { label: "Optimize", desc: "Improve performance" }
          ].map((action) => (
            <GlassCard key={action.label} className="!p-4 hover:border-purple-500/40 transition-all cursor-pointer">
              <div className="font-bold text-[#DAE2FD] mb-1">{action.label}</div>
              <div className="text-sm text-[#BBC9CD]">{action.desc}</div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
