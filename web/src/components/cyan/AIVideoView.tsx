import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Video, Upload, Play } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

export function AIVideoView() {
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
                  Video AI
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Video Intelligence
              </h1>
              <p className="text-[#BBC9CD] mt-1">Analyze and edit videos with AI</p>
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

        {/* Upload Area */}
        <GlassCard className="!p-8 mb-6 text-center">
          <div className="p-4 rounded-lg bg-purple-500/10 inline-flex mb-4">
            <Upload className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-[#DAE2FD] mb-2">Upload Video</h3>
          <p className="text-[#BBC9CD] mb-4">Upload videos for AI analysis and editing</p>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all">
            Choose Video
          </button>
        </GlassCard>

        {/* AI Capabilities */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Scene Detection", desc: "Auto-detect scenes" },
            { label: "Object Tracking", desc: "Track objects in video" },
            { label: "Auto Captions", desc: "Generate subtitles" }
          ].map((feature) => (
            <GlassCard key={feature.label} className="!p-4">
              <div className="font-bold text-purple-400 mb-1">{feature.label}</div>
              <div className="text-sm text-[#BBC9CD]">{feature.desc}</div>
            </GlassCard>
          ))}
        </div>

        {/* Recent Videos */}
        <div>
          <h2 className="text-lg font-bold text-[#DAE2FD] mb-4">Recent Videos</h2>
          <div className="grid gap-4">
            {[
              { name: "Team_Meeting.mp4", duration: "45:23", status: "Analyzed" },
              { name: "Product_Demo.mov", duration: "12:34", status: "Processing" }
            ].map((video) => (
              <GlassCard key={video.name} className="!p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <Video className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[#DAE2FD]">{video.name}</div>
                    <div className="text-sm text-[#BBC9CD]">{video.duration}</div>
                  </div>
                  <span className="text-xs px-3 py-1 bg-green-500/10 text-green-400 rounded-md">
                    {video.status}
                  </span>
                  <button className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-purple-500/10 text-purple-400 transition-colors">
                    <Play className="w-5 h-5" />
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
