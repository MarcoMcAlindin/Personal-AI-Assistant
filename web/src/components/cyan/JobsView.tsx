import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import {
  Menu, Briefcase, Search, MapPin, DollarSign, Building2,
  Clock, ExternalLink, Sparkles, Plus, X, Send, Inbox, Check, XCircle,
  ArrowLeft, Upload, FileText, Target, TrendingUp, Award, Zap
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

// Modified: VOS-102 — HTML description rendering + source badge support
const SOURCE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "weworkremotely": { label: "We Work Remotely", color: "#4ade80", bg: "rgba(74, 222, 128, 0.12)", border: "rgba(74, 222, 128, 0.3)" },
  "serper-linkedin": { label: "LinkedIn", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)", border: "rgba(96, 165, 250, 0.3)" },
  "proxycurl": { label: "LinkedIn", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)", border: "rgba(96, 165, 250, 0.3)" },
  "crustdata": { label: "Crustdata", color: "#c084fc", bg: "rgba(192, 132, 252, 0.12)", border: "rgba(192, 132, 252, 0.3)" },
};

function getSourceMeta(source?: string | null) {
  if (!source) return { label: "Unknown", color: "#BBC9CD", bg: "rgba(187, 201, 205, 0.1)", border: "rgba(187, 201, 205, 0.2)" };
  return SOURCE_META[source.toLowerCase()] ?? { label: source, color: "#BBC9CD", bg: "rgba(187, 201, 205, 0.1)", border: "rgba(187, 201, 205, 0.2)" };
}

// Modified: VOS-102 — convert scraped HTML descriptions to Markdown for clean rendering
function htmlToMarkdown(raw: string): string {
  if (!raw) return "";
  if (!/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/(ul|ol)>/gi, "\n")
    .replace(/<(ul|ol)[^>]*>/gi, "\n")
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "### $1\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
import { campaignService } from "../../services/campaignService";
import { supabase } from "../../services/supabase";

import { Database } from "../../types/supabase";
type Campaign = Database['public']['Tables']['campaigns']['Row'];
type InboxItem = Database['public']['Tables']['inbox_items']['Row'];

export function JobsView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [uploadedCV, setUploadedCV] = useState<File | null>(null);
  
  // New campaign form state
  const [newCampaign, setNewCampaign] = useState({
    name: "", keywords: "", location: "", salary: ""
  });

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedCV(file);
    }
  };

  const handleRemoveCV = () => {
    setUploadedCV(null);
  };

  const loadData = async () => {
    try {
      const dbCampaigns = await campaignService.getCampaigns();
      setCampaigns(dbCampaigns);
      const dbInbox = await campaignService.getInboxItems();
      setInboxItems(dbInbox);
    } catch (e) {
      console.error("Failed to load jobs data", e);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime Hook for aggressive background scraping
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inbox_items' },
        (payload) => {
          setInboxItems((prev) => [payload.new as InboxItem, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'campaigns' },
        (payload) => {
          setCampaigns((prev) => prev.map(c => c.id === payload.new.id ? (payload.new as Campaign) : c));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateCampaign = async () => {
    if (newCampaign.name && newCampaign.keywords) {
      try {
        const created = await campaignService.createCampaign({
          name: newCampaign.name,
          job_preferences: {
            keywords: newCampaign.keywords,
            location: newCampaign.location,
            salary: newCampaign.salary
          }
        });
        setCampaigns([created, ...campaigns]);
        setNewCampaign({ name: "", keywords: "", location: "", salary: "" });
        setShowNewCampaign(false);
        
        // Trigger background proxy scrape logic
        await campaignService.triggerScrapeRun(created.id);
      } catch (e) {
        console.error("Failed creating campaign", e);
      }
    }
  };

  const handleInboxAction = async (itemId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      await campaignService.updateInboxStatus(itemId, action);
      setInboxItems(prev => prev.filter(i => i.id !== itemId));
    } catch (e) {
      console.error("Action failed", e);
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === "RUNNING" || c.status === "DRAFT").length;
  const pendingInbox = inboxItems.filter(i => i.status === "PENDING_REVIEW");

  // If a campaign is selected, show detailed view
  if (selectedCampaign) {
    const campaignItems = inboxItems.filter(i => i.campaign_id === selectedCampaign.id);
    const prefs = selectedCampaign.job_preferences as any;

    return (
      <div className={`${isMobile ? 'pt-16 pb-8' : 'pl-64'} min-h-screen`}>
        {!isMobile && <Sidebar />}
        <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
          {/* Back Button and Header */}
          <div className="mb-8">
            <button
              onClick={() => setSelectedCampaign(null)}
              className="flex items-center gap-2 text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back to Campaigns</span>
            </button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                    {selectedCampaign.name}
                  </h1>
                  {(selectedCampaign.status === "RUNNING" || selectedCampaign.status === "DRAFT") && (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                      <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-sm text-green-400 font-semibold">{selectedCampaign.status}</span>
                    </div>
                  )}
                </div>
                <p className="text-[#BBC9CD]">AI-powered matches based on your profile</p>
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

            {/* Campaign Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GlassCard className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-[#00FFFF]" />
                  <span className="text-sm text-[#BBC9CD]">Keywords</span>
                </div>
                <div className="font-semibold text-white">{prefs?.keywords || "Any"}</div>
              </GlassCard>

              <GlassCard className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-[#00FFFF]" />
                  <span className="text-sm text-[#BBC9CD]">Location</span>
                </div>
                <div className="font-semibold text-white">{prefs?.location || "Any"}</div>
              </GlassCard>

              <GlassCard className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-[#00FFFF]" />
                  <span className="text-sm text-[#BBC9CD]">Min Salary</span>
                </div>
                <div className="font-semibold text-white">{prefs?.salary || "Any"}</div>
              </GlassCard>

              <GlassCard className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Inbox className="w-4 h-4 text-[#00FFFF]" />
                  <span className="text-sm text-[#BBC9CD]">Results</span>
                </div>
                <div className="font-semibold text-white">{selectedCampaign.total_jobs_found || 0} jobs</div>
              </GlassCard>
            </div>
          </div>

          {/* AI Match Analysis */}
          <GlassCard className="!p-8 mb-8 border-[#00FFFF]/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#00FFFF]/10">
                <Sparkles className="w-6 h-6 text-[#00FFFF]" />
              </div>
              <h2 className="text-2xl font-semibold text-white">AI Campaign Analysis</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-[#0A0A0A]/50 rounded-lg p-4 border border-[#00FFFF]/10">
                <h3 className="text-white font-semibold mb-2">Overall Performance</h3>
                <p className="text-[#BBC9CD] text-sm leading-relaxed">
                  {(selectedCampaign.ai_analysis as any)?.overall_performance || "AI agent is currently analyzing your campaign requirements and profile..."}
                </p>
              </div>

              <div className="bg-[#0A0A0A]/50 rounded-lg p-4 border border-[#00FFFF]/10">
                <h3 className="text-white font-semibold mb-3">Top Match Factors</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  {((selectedCampaign.ai_analysis as any)?.match_factors || [
                    { title: "Keywords", description: "Aligning search terms..." },
                    { title: "Location", description: "Filtering by region..." },
                    { title: "Salary", description: "Matching expectations..." }
                  ]).map((factor: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      {idx === 0 ? <Target className="w-5 h-5 text-[#00FFFF] mt-0.5 flex-shrink-0" /> : 
                       idx === 1 ? <Award className="w-5 h-5 text-[#00FFFF] mt-0.5 flex-shrink-0" /> : 
                       <TrendingUp className="w-5 h-5 text-[#00FFFF] mt-0.5 flex-shrink-0" />}
                      <div>
                        <div className="text-sm font-semibold text-white">{factor.title}</div>
                        <div className="text-xs text-[#BBC9CD]">{factor.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Matched Jobs — Modified: VOS-102 grid layout, Markdown descriptions, source badges */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
              <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                Matched Opportunities ({campaignItems.length})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {campaignItems.length === 0 && (
                <div className="col-span-full text-[#BBC9CD] py-4">No matched jobs found for this campaign yet.</div>
              )}
              {campaignItems.map((job) => {
                const src = getSourceMeta(job.source);
                const descMarkdown = htmlToMarkdown(job.job_description || "");
                return (
                  <GlassCard key={job.id} className="!p-5 hover:border-[#00FFFF]/40 transition-all flex flex-col">
                    {/* Card Header: source badge + match score */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-md"
                        style={{ color: src.color, backgroundColor: src.bg, border: `1px solid ${src.border}` }}
                      >
                        {src.label}
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/15 border border-green-500/25">
                        <Sparkles className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs font-bold text-green-400">
                          {job.match_score ? Math.round(job.match_score * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    {/* Company icon + title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00FFFF]/20 to-[#0099CC]/20 border border-[#00FFFF]/30 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-[#00FFFF]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[#DAE2FD] text-base leading-tight mb-0.5 truncate">{job.job_title}</h3>
                        <p className="text-sm text-[#BBC9CD] truncate">{job.company_name} · {job.remote_type}</p>
                      </div>
                    </div>

                    {/* Meta tags */}
                    <div className="flex flex-wrap gap-3 text-xs mb-3">
                      <div className="flex items-center gap-1 text-[#BBC9CD]">
                        <MapPin className="w-3.5 h-3.5 text-[#00FFFF]" />
                        {job.location || "N/A"}
                      </div>
                      <div className="flex items-center gap-1 text-[#BBC9CD]">
                        <DollarSign className="w-3.5 h-3.5 text-[#00FFFF]" />
                        {job.salary_range || "Undisclosed"}
                      </div>
                      <div className="flex items-center gap-1 text-[#BBC9CD]">
                        <Clock className="w-3.5 h-3.5 text-[#00FFFF]" />
                        Recently
                      </div>
                    </div>

                    {/* Description — rendered as Markdown */}
                    <div className="flex-1 overflow-hidden mb-3 prose prose-sm prose-invert max-w-none
                      [&>p]:text-[#BBC9CD] [&>p]:text-sm [&>p]:leading-relaxed [&>p]:mb-2
                      [&>ul]:text-[#BBC9CD] [&>ul]:text-sm [&>ul]:pl-4 [&>ul]:mb-2
                      [&>li]:mb-0.5 [&>h3]:text-white [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1
                      line-clamp-[8]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                        {descMarkdown || "No description available."}
                      </ReactMarkdown>
                    </div>

                    {/* Match reason */}
                    {(job.match_reasoning || prefs?.keywords) && (
                      <div className="bg-[#0A0A0A]/50 rounded-lg p-3 border border-[#00FFFF]/10 mb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Zap className="w-3.5 h-3.5 text-[#00FFFF]" />
                          <span className="font-semibold text-white text-xs">Why This Matches</span>
                        </div>
                        {prefs?.keywords && (
                          <div className="flex items-start gap-1.5 text-xs text-[#BBC9CD]">
                            <Check className="w-3.5 h-3.5 text-[#00FFFF] mt-0.5 flex-shrink-0" />
                            <span>Keywords: {prefs.keywords}</span>
                          </div>
                        )}
                        {job.match_reasoning && (
                          <div className="flex items-start gap-1.5 text-xs text-[#BBC9CD] mt-1">
                            <Check className="w-3.5 h-3.5 text-[#00FFFF] mt-0.5 flex-shrink-0" />
                            <span>{job.match_reasoning}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => window.open(job.job_url || "", "_blank")}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#00FFFF]/15 to-[#0099CC]/15 hover:from-[#00FFFF]/25 hover:to-[#0099CC]/25 text-[#00FFFF] text-xs font-semibold transition-all border border-[#00FFFF]/30"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => handleInboxAction(job.id, "APPROVED")}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-semibold transition-colors border border-green-500/25"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Apply
                      </button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }



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
                  Job Search
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Career Opportunities
              </h1>
              <p className="text-[#BBC9CD] mt-1">AI-powered job search campaigns</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-[#00FFFF]/10 inline-flex mb-3">
              <Search className="w-5 h-5 text-[#00FFFF]" />
            </div>
            <div className="text-2xl font-bold text-[#00FFFF] mb-1">{activeCampaigns}</div>
            <div className="text-sm text-[#BBC9CD]">Active Campaigns</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-green-500/10 inline-flex mb-3">
              <Inbox className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400 mb-1">{pendingInbox.length}</div>
            <div className="text-sm text-[#BBC9CD]">Pending Review</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-yellow-500/10 inline-flex mb-3">
              <Send className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-yellow-400 mb-1">0</div>
            <div className="text-sm text-[#BBC9CD]">Applications</div>
          </GlassCard>

          <GlassCard className="!p-4">
            <div className="p-2 rounded-lg bg-purple-500/10 inline-flex mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400 mb-1">0%</div>
            <div className="text-sm text-[#BBC9CD]">Match Score</div>
          </GlassCard>
        </div>

        {/* Active Campaigns Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
              <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                Your Campaigns
              </span>
            </div>
            <button
              onClick={() => setShowNewCampaign(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 hover:from-[#00FFFF]/30 hover:to-[#0099CC]/30 text-[#00FFFF] font-semibold transition-all border border-[#00FFFF]/40 hover:border-[#00FFFF]/60 shadow-[0_0_20px_rgba(0,255,255,0.2)]"
            >
              <Plus className="w-4 h-4" />
              {!isMobile && "New Campaign"}
            </button>
          </div>

          {/* New Campaign Form */}
          {showNewCampaign && (
            <GlassCard className="!p-6 mb-4 border-[#00FFFF]/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#DAE2FD] text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#00FFFF]" />
                  Create New Job Campaign
                </h3>
                <button
                  onClick={() => setShowNewCampaign(false)}
                  className="p-2 rounded-lg hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="e.g., Senior Executive Roles"
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder-[#BBC9CD]/50 focus:border-[#00FFFF]/40 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Job Keywords</label>
                  <input
                    type="text"
                    value={newCampaign.keywords}
                    onChange={(e) => setNewCampaign({ ...newCampaign, keywords: e.target.value })}
                    placeholder="e.g., Director, VP, Chief, Executive"
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder-[#BBC9CD]/50 focus:border-[#00FFFF]/40 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Location</label>
                    <input
                      type="text"
                      value={newCampaign.location}
                      onChange={(e) => setNewCampaign({ ...newCampaign, location: e.target.value })}
                      placeholder="e.g., Remote, San Francisco"
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder-[#BBC9CD]/50 focus:border-[#00FFFF]/40 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Minimum Salary</label>
                    <input
                      type="text"
                      value={newCampaign.salary}
                      onChange={(e) => setNewCampaign({ ...newCampaign, salary: e.target.value })}
                      placeholder="e.g., $150k+"
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder-[#BBC9CD]/50 focus:border-[#00FFFF]/40 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* CV Upload Section */}
                <div>
                  <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Upload CV/Resume</label>
                  
                  {!uploadedCV ? (
                    <label
                      htmlFor="cv-upload"
                      className="flex flex-col items-center justify-center p-6 rounded-xl bg-[#0A0A0A]/50 border-2 border-dashed border-[#00FFFF]/20 hover:border-[#00FFFF]/40 transition-all cursor-pointer group"
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleCVUpload}
                        className="hidden"
                        id="cv-upload"
                      />
                      <Upload className="w-8 h-8 text-[#00FFFF] mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-[#BBC9CD] mb-1">Click to upload your CV</span>
                      <span className="text-xs text-[#BBC9CD]/60">PDF, DOC, or DOCX (Max 10MB)</span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#0A0A0A]/50 border border-[#00FFFF]/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#00FFFF]/10">
                          <FileText className="w-5 h-5 text-[#00FFFF]" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#DAE2FD]">{uploadedCV.name}</div>
                          <div className="text-xs text-[#BBC9CD]">{(uploadedCV.size / 1024).toFixed(2)} KB</div>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCV}
                        className="p-2 rounded-lg hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-red-400 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateCampaign}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 hover:from-[#00FFFF]/30 hover:to-[#0099CC]/30 text-[#00FFFF] font-semibold transition-all border border-[#00FFFF]/40 hover:border-[#00FFFF]/60 shadow-[0_0_20px_rgba(0,255,255,0.2)]"
                >
                  <Sparkles className="w-5 h-5" />
                  Start AI Agent
                </button>

              </div>
            </GlassCard>
          )}

          {/* Campaign List */}
          <div className="space-y-3">
            {campaigns.length === 0 && (
              <div className="text-center py-6 text-[#BBC9CD]">No active campaigns.</div>
            )}
            {campaigns.map((campaign) => {
              const prefs = campaign.job_preferences as Record<string, any>;
              return (
              <GlassCard 
                key={campaign.id} 
                className="!p-4 hover:border-[#00FFFF]/40 transition-all cursor-pointer"
                onClick={() => setSelectedCampaign(campaign)}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-[#DAE2FD] text-lg">{campaign.name}</h3>
                      {(campaign.status === "RUNNING" || campaign.status === "DRAFT") && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-xs text-green-400 font-semibold">{campaign.status}</span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-[#BBC9CD]">
                        <Search className="w-4 h-4 text-[#00FFFF]" />
                        {prefs?.keywords || "Any"}
                      </div>
                      <div className="flex items-center gap-2 text-[#BBC9CD]">
                        <MapPin className="w-4 h-4 text-[#00FFFF]" />
                        {prefs?.location || "Any"}
                      </div>
                      <div className="flex items-center gap-2 text-[#BBC9CD]">
                        <DollarSign className="w-4 h-4 text-[#00FFFF]" />
                        {prefs?.salary || "Any"}
                      </div>
                      <div className="flex items-center gap-2 text-[#BBC9CD]">
                        <Inbox className="w-4 h-4 text-[#00FFFF]" />
                        {campaign.total_jobs_found || 0} results
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[#00FFFF]">
                    <span className="text-sm font-semibold">View Results</span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </GlassCard>
            )})}
          </div>
        </div>

        {/* Job Results Inbox (HITL) */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
            <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
              Search Results
            </span>
          </div>

          <div className="space-y-3">
             {pendingInbox.length === 0 && (
              <div className="text-center py-6 text-[#BBC9CD]">No new search results.</div>
            )}
            {pendingInbox.map((job) => (
              <GlassCard key={job.id} className="!p-6 hover:border-[#00FFFF]/40 transition-all group">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Company Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#00FFFF]/20 to-[#0099CC]/20 border border-[#00FFFF]/30 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-[#00FFFF]" />
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-[#DAE2FD] text-lg mb-1">{job.job_title}</h3>
                        <div className="flex items-center gap-2 text-[#BBC9CD] mb-2">
                          <span className="font-semibold">{job.company_name}</span>
                          <span>•</span>
                          <span>{job.remote_type || job.source}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                        <Sparkles className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-bold text-green-400">
                          {job.match_score ? Math.round(job.match_score * 100) : 0}% Match
                        </span>
                      </div>
                    </div>

                    {/* Description — Modified: VOS-102 apply htmlToMarkdown + ReactMarkdown (was raw HTML string) */}
                    <div className="text-sm text-[#BBC9CD] mb-4 line-clamp-3 overflow-hidden prose prose-sm prose-invert max-w-none
                      [&>p]:text-[#BBC9CD] [&>p]:text-sm [&>p]:mb-1 [&>ul]:text-[#BBC9CD] [&>ul]:text-sm [&>ul]:pl-4
                      [&>li]:mb-0.5 [&>strong]:text-white [&>h3]:text-white [&>h3]:text-sm [&>h3]:font-semibold">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                        {htmlToMarkdown(job.job_description || "") || "No description available."}
                      </ReactMarkdown>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-[#00FFFF]" />
                        <span className="text-[#BBC9CD]">{job.location || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-[#00FFFF]" />
                        <span className="text-[#BBC9CD]">{job.salary_range || 'Undisclosed'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-[#00FFFF]" />
                        <span className="text-[#BBC9CD]">Recently</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => window.open(job.job_url, '_blank')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 hover:from-[#00FFFF]/30 hover:to-[#0099CC]/30 text-[#00FFFF] font-semibold transition-all border border-[#00FFFF]/40"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Job
                      </button>
                      <button 
                        onClick={() => handleInboxAction(job.id, 'APPROVED')}
                        className="px-4 py-2 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] font-semibold transition-colors border border-[#00FFFF]/20"
                      >
                        Save for Later
                      </button>
                      <button 
                        onClick={() => handleInboxAction(job.id, 'REJECTED')}
                        className="px-4 py-2 rounded-xl bg-[#1A1A1A]/50 hover:bg-red-500/20 text-[#BBC9CD] hover:text-red-400 border border-[#00FFFF]/20 hover:border-red-500/40 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
