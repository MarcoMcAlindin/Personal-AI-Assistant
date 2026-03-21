import { Bell, User, Zap } from "lucide-react";

export function MobileHeader() {
  return (
    <div 
      className="fixed top-0 left-0 right-0 h-16 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#00FFFF]/10 z-40 px-4"
      style={{
        boxShadow: '0 4px 24px rgba(0, 255, 255, 0.08)'
      }}
    >
      <div className="h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFFF] to-[#0099CC] flex items-center justify-center shadow-[0_0_16px_rgba(0,255,255,0.4)]">
            <Zap className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#00FFFF] tracking-wide">SUPER CYAN</div>
            <div className="text-[8px] text-[#00FFFF]/60 uppercase tracking-widest">AI Orchestrator</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
