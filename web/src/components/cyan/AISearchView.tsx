import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Search } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

export function AISearchView() {
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
                  AI Search
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Smart Search
              </h1>
              <p className="text-[#BBC9CD] mt-1">Intelligent search across all your data</p>
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

        {/* Search Interface */}
        <GlassCard className="!p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-[#00FFFF]/10">
              <Search className="w-6 h-6 text-[#00FFFF]" />
            </div>
            <input
              type="text"
              placeholder="Search anything..."
              className="flex-1 bg-[#0D0D12] text-[#DAE2FD] px-4 py-3 rounded-lg border border-[#00FFFF]/20 focus:border-[#00FFFF]/40 focus:outline-none"
            />
          </div>
          <div className="text-sm text-[#BBC9CD]">
            Try searching for documents, emails, tasks, or any data across your workspace
          </div>
        </GlassCard>

        {/* Recent Searches */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#DAE2FD] mb-4">Recent Searches</h2>
          <div className="space-y-2">
            {["Project updates", "Q1 reports", "Team meetings"].map((term) => (
              <GlassCard key={term} className="!p-4 hover:border-[#00FFFF]/40 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-[#BBC9CD]" />
                  <span className="text-[#DAE2FD]">{term}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
