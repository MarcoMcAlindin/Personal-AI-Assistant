import { useState, useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router";
import { Menu, Mail, Calendar, Link as LinkIcon, CheckCircle2, Database, AlertCircle } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";
import { emailService } from "../../services/emailService";

export function IntegrationsView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [searchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  const [showConnectedBanner, setShowConnectedBanner] = useState(false);

  const fetchGmailStatus = async () => {
    try {
      const status = await emailService.getGoogleStatus();
      setGmailConnected(status.connected);
      setGmailEmail(status.email);
    } catch (err) {
      console.error('[IntegrationsView] Gmail status error:', err);
      setGmailConnected(false);
      setGmailEmail(null);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchGmailStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get('connected') === 'gmail') {
      setShowConnectedBanner(true);
      fetchGmailStatus();
      const timer = setTimeout(() => setShowConnectedBanner(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleGmailConnect = async () => {
    try {
      setGmailLoading(true);
      const url = await emailService.getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error('[IntegrationsView] Gmail connect error:', err);
      setGmailLoading(false);
    }
  };

  const handleGmailDisconnect = async () => {
    try {
      setGmailLoading(true);
      await emailService.disconnectGoogle();
      setGmailConnected(false);
      setGmailEmail(null);
    } catch (err) {
      console.error('[IntegrationsView] Gmail disconnect error:', err);
    } finally {
      setGmailLoading(false);
    }
  };

  const connectedCount = gmailConnected ? 1 : 0;
  // Gmail (real) + Google Calendar (coming soon) = 2 available
  const availableCount = 2;

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

        {/* Connected banner */}
        {showConnectedBanner && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
            Gmail connected successfully.
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-[#00FFFF]/10 inline-flex mb-3">
              <LinkIcon className="w-5 h-5 text-[#00FFFF]" />
            </div>
            <div className="text-2xl font-bold text-[#00FFFF] mb-1">
              {statusLoading ? '-' : connectedCount}
            </div>
            <div className="text-sm text-[#BBC9CD]">Connected</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-green-500/10 inline-flex mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400 mb-1">
              {statusLoading ? '-' : connectedCount}
            </div>
            <div className="text-sm text-[#BBC9CD]">Active</div>
          </GlassCard>

          <GlassCard className="!p-4 col-span-2 md:col-span-1">
            <div className="p-2 rounded-lg bg-[#BBC9CD]/10 inline-flex mb-3">
              <Database className="w-5 h-5 text-[#BBC9CD]" />
            </div>
            <div className="text-2xl font-bold text-[#BBC9CD] mb-1">{availableCount}</div>
            <div className="text-sm text-[#BBC9CD]">Available</div>
          </GlassCard>
        </div>

        {/* Integration Cards */}
        <div className="space-y-4">

          {/* Gmail - real OAuth */}
          <GlassCard
            className={`!p-6 hover:border-[#00FFFF]/40 transition-all ${gmailConnected ? 'border-[#00FFFF]/40' : ''}`}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-4 rounded-xl ${gmailConnected ? 'bg-[#00FFFF]/20' : 'bg-[#0D0D12]'} flex-shrink-0`}>
                  <Mail className={`w-6 h-6 ${gmailConnected ? 'text-[#00FFFF]' : 'text-[#BBC9CD]'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-[#DAE2FD] text-lg">Gmail</h3>
                    {gmailConnected && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></div>
                        <span className="text-xs text-green-400 font-semibold">Active</span>
                      </div>
                    )}
                  </div>

                  {gmailConnected && gmailEmail ? (
                    <p className="text-sm text-[#00FFFF] mb-2 font-medium">{gmailEmail}</p>
                  ) : null}

                  <p className="text-sm text-[#BBC9CD] mb-3">
                    Connect your Gmail account to access emails and contacts
                  </p>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1A1A1A]/50 border border-[#00FFFF]/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#00FFFF]"></div>
                    <span className="text-xs text-[#BBC9CD] capitalize">email</span>
                  </div>
                </div>
              </div>

              <div className="flex md:flex-shrink-0">
                {gmailConnected ? (
                  <button
                    onClick={handleGmailDisconnect}
                    disabled={gmailLoading}
                    className="px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold transition-all border border-red-500/30 hover:border-red-500/50 w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gmailLoading ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    onClick={handleGmailConnect}
                    disabled={gmailLoading || statusLoading}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 hover:from-[#00FFFF]/30 hover:to-[#0099CC]/30 text-[#00FFFF] font-semibold transition-all border border-[#00FFFF]/40 hover:border-[#00FFFF]/60 shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gmailLoading ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Google Calendar - Coming Soon */}
          <GlassCard className="!p-6 opacity-60">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-4 rounded-xl bg-[#0D0D12] flex-shrink-0">
                  <Calendar className="w-6 h-6 text-[#BBC9CD]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-[#DAE2FD] text-lg">Google Calendar</h3>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1A1A1A] border border-[#BBC9CD]/20">
                      <span className="text-xs text-[#BBC9CD] font-semibold">Coming Soon</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#BBC9CD] mb-3">
                    Sync your calendar events and schedules
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1A1A1A]/50 border border-[#00FFFF]/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#BBC9CD]"></div>
                    <span className="text-xs text-[#BBC9CD] capitalize">calendar</span>
                  </div>
                </div>
              </div>

              <div className="flex md:flex-shrink-0">
                <button
                  disabled
                  className="px-6 py-3 rounded-xl bg-[#1A1A1A]/50 text-[#BBC9CD]/50 font-semibold border border-[#BBC9CD]/20 w-full md:w-auto cursor-not-allowed"
                >
                  Connect
                </button>
              </div>
            </div>
          </GlassCard>
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
                Connect external services to enable features like email sync and calendar integration.
                Your credentials are securely stored and can be disconnected at any time.
                Authorise Super Cyan in your Google account settings for full access.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
