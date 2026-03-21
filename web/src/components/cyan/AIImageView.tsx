import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Image, Sparkles } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

export function AIImageView() {
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
                  Image Generation
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                AI Image Creator
              </h1>
              <p className="text-[#BBC9CD] mt-1">Generate stunning images with AI</p>
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

        {/* Prompt Input */}
        <GlassCard className="!p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-[#00FFFF]/10">
              <Sparkles className="w-6 h-6 text-[#00FFFF]" />
            </div>
            <h3 className="font-bold text-[#DAE2FD]">Describe Your Image</h3>
          </div>
          <textarea
            className="w-full h-32 bg-[#0D0D12] text-[#DAE2FD] px-4 py-3 rounded-lg border border-[#00FFFF]/20 focus:border-[#00FFFF]/40 focus:outline-none mb-4"
            placeholder="A futuristic cityscape at sunset with neon lights..."
          />
          <button className="w-full px-6 py-3 bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] font-bold rounded-lg hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] transition-all">
            Generate Image
          </button>
        </GlassCard>

        {/* Gallery */}
        <div>
          <h2 className="text-lg font-bold text-[#DAE2FD] mb-4">Recent Generations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <GlassCard key={i} className="!p-0 overflow-hidden hover:border-[#00FFFF]/40 transition-all">
                <div className="aspect-square bg-gradient-to-br from-[#00FFFF]/10 to-purple-500/10 flex items-center justify-center">
                  <Image className="w-12 h-12 text-[#BBC9CD]" />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
