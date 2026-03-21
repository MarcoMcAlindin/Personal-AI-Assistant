import { useState } from "react";
import { Link, useOutletContext } from "react-router";
import { Menu, MessageSquare, Brain, Search, FileText, Code, Image, Mic, Video } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

const aiFunctions = [
  {
    path: "/ai-chat",
    label: "AI Chat",
    icon: MessageSquare,
    description: "Conversational AI assistant",
    color: "cyan"
  },
  {
    path: "/ai-analysis",
    label: "Data Analysis",
    icon: Brain,
    description: "Analyze complex datasets",
    color: "purple"
  },
  {
    path: "/ai-search",
    label: "Smart Search",
    icon: Search,
    description: "Intelligent search across data",
    color: "cyan"
  },
  {
    path: "/ai-document",
    label: "Document AI",
    icon: FileText,
    description: "Extract and summarize docs",
    color: "cyan"
  },
  {
    path: "/ai-code",
    label: "Code Assistant",
    icon: Code,
    description: "AI-powered code help",
    color: "purple"
  },
  {
    path: "/ai-image",
    label: "Image Generation",
    icon: Image,
    description: "Create AI-generated images",
    color: "cyan"
  },
  {
    path: "/ai-voice",
    label: "Voice AI",
    icon: Mic,
    description: "Speech-to-text & synthesis",
    color: "cyan"
  },
  {
    path: "/ai-video",
    label: "Video AI",
    icon: Video,
    description: "Video analysis & editing",
    color: "purple"
  },
];

export function AIFunctionsView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`${isMobile ? 'pt-16 pb-8' : 'pl-64'} min-h-screen`}>
      {!isMobile && <Sidebar />}
      <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
        {/* Header */}
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
                AI Workspace
              </h1>
              <p className="text-[#BBC9CD] mt-1">Choose an AI capability to get started</p>
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

        {/* AI Functions Grid */}
        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
          {aiFunctions.map((func) => {
            const Icon = func.icon;
            return (
              <Link key={func.path} to={func.path}>
                <GlassCard 
                  className="!p-6 hover:border-[#00FFFF]/40 transition-all hover:shadow-[0_0_30px_rgba(0,255,255,0.2)] h-full"
                  glowColor={func.color}
                >
                  <div className={`p-3 rounded-lg inline-flex mb-4 ${
                    func.color === 'cyan' 
                      ? 'bg-[#00FFFF]/10' 
                      : 'bg-purple-500/10'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      func.color === 'cyan' 
                        ? 'text-[#00FFFF]' 
                        : 'text-purple-400'
                    }`} />
                  </div>
                  <h3 className="font-bold text-[#DAE2FD] mb-2">{func.label}</h3>
                  <p className="text-sm text-[#BBC9CD]">{func.description}</p>
                </GlassCard>
              </Link>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="!p-4">
            <div className="text-sm text-[#BBC9CD] mb-1">AI Requests Today</div>
            <div className="text-2xl font-bold text-[#00FFFF]">1,247</div>
            <div className="text-xs text-green-400 mt-1">+18% from yesterday</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="text-sm text-[#BBC9CD] mb-1">Active AI Agents</div>
            <div className="text-2xl font-bold text-[#00FFFF]">8</div>
            <div className="text-xs text-green-400 mt-1">All systems operational</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="text-sm text-[#BBC9CD] mb-1">Response Time</div>
            <div className="text-2xl font-bold text-[#00FFFF]">0.8s</div>
            <div className="text-xs text-green-400 mt-1">-0.2s faster</div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
