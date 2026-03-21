import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Mail, Calendar, Cloud, Database, Link as LinkIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  connected: boolean;
  status: "active" | "inactive" | "error";
  category: "email" | "calendar" | "storage" | "other";
}

const integrations: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Connect your Gmail account to access emails and contacts",
    icon: Mail,
    connected: false,
    status: "inactive",
    category: "email"
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync your calendar events and schedules",
    icon: Calendar,
    connected: false,
    status: "inactive",
    category: "calendar"
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Connect your Outlook email and calendar",
    icon: Mail,
    connected: false,
    status: "inactive",
    category: "email"
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access and manage your cloud files",
    icon: Cloud,
    connected: false,
    status: "inactive",
    category: "storage"
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Connect your Dropbox for file storage",
    icon: Database,
    connected: false,
    status: "inactive",
    category: "storage"
  },
];

export function IntegrationsView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set());

  const handleConnect = (id: string) => {
    // Simulate connection process
    setConnectedIntegrations(prev => new Set(prev).add(id));
  };

  const handleDisconnect = (id: string) => {
    setConnectedIntegrations(prev => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
  };

  const connectedCount = connectedIntegrations.size;

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
                  Integrations
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                External Services
              </h1>
              <p className="text-[#BBC9CD] mt-1">Connect and manage your accounts</p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-[#00FFFF]/10 inline-flex mb-3">
              <LinkIcon className="w-5 h-5 text-[#00FFFF]" />
            </div>
            <div className="text-2xl font-bold text-[#00FFFF] mb-1">{connectedCount}</div>
            <div className="text-sm text-[#BBC9CD]">Connected</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-green-500/10 inline-flex mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400 mb-1">{connectedCount}</div>
            <div className="text-sm text-[#BBC9CD]">Active</div>
          </GlassCard>

          <GlassCard className="!p-4 col-span-2 md:col-span-1">
            <div className="p-2 rounded-lg bg-[#BBC9CD]/10 inline-flex mb-3">
              <Database className="w-5 h-5 text-[#BBC9CD]" />
            </div>
            <div className="text-2xl font-bold text-[#BBC9CD] mb-1">{integrations.length}</div>
            <div className="text-sm text-[#BBC9CD]">Available</div>
          </GlassCard>
        </div>

        {/* Integration Cards */}
        <div className="space-y-4">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            const isConnected = connectedIntegrations.has(integration.id);

            return (
              <GlassCard 
                key={integration.id} 
                className={`!p-6 hover:border-[#00FFFF]/40 transition-all ${isConnected ? 'border-[#00FFFF]/40' : ''}`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Icon and Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-4 rounded-xl ${isConnected ? 'bg-[#00FFFF]/20' : 'bg-[#0D0D12]'} flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${isConnected ? 'text-[#00FFFF]' : 'text-[#BBC9CD]'}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-[#DAE2FD] text-lg">{integration.name}</h3>
                        {isConnected && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></div>
                            <span className="text-xs text-green-400 font-semibold">Active</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-[#BBC9CD] mb-3">{integration.description}</p>
                      
                      {/* Category Badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1A1A1A]/50 border border-[#00FFFF]/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#00FFFF]"></div>
                        <span className="text-xs text-[#BBC9CD] capitalize">{integration.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex md:flex-shrink-0">
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        className="px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold transition-all border border-red-500/30 hover:border-red-500/50 w-full md:w-auto"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(integration.id)}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 hover:from-[#00FFFF]/30 hover:to-[#0099CC]/30 text-[#00FFFF] font-semibold transition-all border border-[#00FFFF]/40 hover:border-[#00FFFF]/60 shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] w-full md:w-auto"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Help Section */}
        <GlassCard className="mt-8 !p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <AlertCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-[#DAE2FD] mb-2">About Integrations</h3>
              <p className="text-sm text-[#BBC9CD] leading-relaxed">
                Connect external services to enable features like email sync, calendar integration, and file storage access. 
                Your credentials are securely stored and can be disconnected at any time. 
                Make sure to authorize Super Cyan in your account settings for full access.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
