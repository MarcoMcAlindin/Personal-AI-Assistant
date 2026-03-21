import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Mic, Volume2, Play } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

export function AIVoiceView() {
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
                  Voice AI
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Voice Assistant
              </h1>
              <p className="text-[#BBC9CD] mt-1">Speech-to-text and voice synthesis</p>
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

        {/* Voice Input */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <GlassCard className="!p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-[#00FFFF]/10">
                <Mic className="w-6 h-6 text-[#00FFFF]" />
              </div>
              <h3 className="font-bold text-[#DAE2FD]">Speech to Text</h3>
            </div>
            <p className="text-sm text-[#BBC9CD] mb-4">Record audio and convert to text</p>
            <button className="w-full px-6 py-12 bg-gradient-to-br from-[#00FFFF]/10 to-transparent border-2 border-[#00FFFF]/40 text-[#00FFFF] font-bold rounded-lg hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] transition-all flex flex-col items-center gap-2">
              <Mic className="w-12 h-12" />
              <span>Tap to Record</span>
            </button>
          </GlassCard>

          <GlassCard className="!p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-[#00FFFF]/10">
                <Volume2 className="w-6 h-6 text-[#00FFFF]" />
              </div>
              <h3 className="font-bold text-[#DAE2FD]">Text to Speech</h3>
            </div>
            <p className="text-sm text-[#BBC9CD] mb-4">Convert text to natural speech</p>
            <textarea
              className="w-full h-24 bg-[#0D0D12] text-[#DAE2FD] px-4 py-3 rounded-lg border border-[#00FFFF]/20 focus:border-[#00FFFF]/40 focus:outline-none mb-3"
              placeholder="Enter text to speak..."
            />
            <button className="w-full px-6 py-3 bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] font-bold rounded-lg hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] transition-all flex items-center justify-center gap-2">
              <Play className="w-5 h-5" />
              Generate Speech
            </button>
          </GlassCard>
        </div>

        {/* Recent Recordings */}
        <div>
          <h2 className="text-lg font-bold text-[#DAE2FD] mb-4">Recent Recordings</h2>
          <div className="space-y-3">
            {["Meeting notes - 5:34", "Voice memo - 2:12", "Presentation draft - 8:45"].map((item) => (
              <GlassCard key={item} className="!p-4 hover:border-[#00FFFF]/40 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-[#00FFFF]/10">
                    <Mic className="w-5 h-5 text-[#00FFFF]" />
                  </div>
                  <span className="text-[#DAE2FD] flex-1">{item}</span>
                  <button className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#00FFFF]/10 text-[#00FFFF] transition-colors">
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
