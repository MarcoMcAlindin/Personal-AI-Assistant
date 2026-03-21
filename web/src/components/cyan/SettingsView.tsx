import { useOutletContext } from "react-router";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { MobileHeader } from "./MobileHeader";
import { BurgerMenu } from "./BurgerMenu";
import { GlassCard } from "./GlassCard";
import { Settings, User, Bell, Shield, Palette, Menu } from "lucide-react";

export function SettingsView() {
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
                  Configuration
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Settings
              </h1>
              <p className="text-[#BBC9CD] mt-1">Customize your AI orchestration platform</p>
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

        <div className="space-y-6 max-w-3xl">
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#00FFFF]/10">
                <User className="w-5 h-5 text-[#00FFFF]" />
              </div>
              <h3 className="font-bold text-[#DAE2FD]">Profile Settings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#BBC9CD] mb-2">Display Name</label>
                <input
                  type="text"
                  placeholder="Engineering Executive"
                  className="w-full px-4 py-3 rounded-xl bg-[#0D0D12]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder:text-[#BBC9CD]/50 focus:outline-none focus:border-[#00FFFF]/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[#BBC9CD] mb-2">Email</label>
                <input
                  type="email"
                  placeholder="executive@company.com"
                  className="w-full px-4 py-3 rounded-xl bg-[#0D0D12]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder:text-[#BBC9CD]/50 focus:outline-none focus:border-[#00FFFF]/40 transition-colors"
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#00FFFF]/10">
                <Bell className="w-5 h-5 text-[#00FFFF]" />
              </div>
              <h3 className="font-bold text-[#DAE2FD]">Notifications</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: "Task Completion", enabled: true },
                { label: "Agent Errors", enabled: true },
                { label: "System Alerts", enabled: true },
                { label: "Weekly Reports", enabled: false },
              ].map((setting) => (
                <div key={setting.label} className="flex items-center justify-between">
                  <span className="text-[#DAE2FD]">{setting.label}</span>
                  <button
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      setting.enabled ? 'bg-[#00FFFF]' : 'bg-[#BBC9CD]/20'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        setting.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    ></div>
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#00FFFF]/10">
                <Shield className="w-5 h-5 text-[#00FFFF]" />
              </div>
              <h3 className="font-bold text-[#DAE2FD]">Security</h3>
            </div>
            <div className="space-y-4">
              <button className="w-full p-3 rounded-xl border border-[#00FFFF]/40 text-[#00FFFF] font-semibold hover:bg-[#00FFFF]/10 transition-all text-left">
                Change Password
              </button>
              <button className="w-full p-3 rounded-xl border border-[#00FFFF]/40 text-[#00FFFF] font-semibold hover:bg-[#00FFFF]/10 transition-all text-left">
                Two-Factor Authentication
              </button>
              <button className="w-full p-3 rounded-xl border border-[#00FFFF]/40 text-[#00FFFF] font-semibold hover:bg-[#00FFFF]/10 transition-all text-left">
                API Keys
              </button>
            </div>
          </GlassCard>

          <button className="w-full p-4 rounded-xl bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] font-bold hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}