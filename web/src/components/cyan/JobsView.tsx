import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router";
import {
  Menu, Briefcase, Search, MapPin, DollarSign, Building2,
  Clock, ExternalLink, Sparkles, Plus, X, Send, Inbox, Check, XCircle,
  ArrowLeft, Upload, FileText, Target, TrendingUp, Award, Zap, Loader2, Edit3, Filter
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

const SOURCE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "weworkremotely":  { label: "We Work Remotely", color: "#4ade80",  bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)" },
  "linkedin":        { label: "LinkedIn",          color: "#60a5fa",  bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)" },
  "serper-linkedin": { label: "LinkedIn",          color: "#60a5fa",  bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)" },
  "proxycurl":       { label: "LinkedIn",          color: "#60a5fa",  bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)" },
  "indeed":          { label: "Indeed",            color: "#f59e0b",  bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)" },
  "glassdoor":       { label: "Glassdoor",         color: "#34d399",  bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)" },
  "reed":            { label: "Reed",              color: "#f87171",  bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
  "totaljobs":       { label: "TotalJobs",         color: "#a78bfa",  bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)" },
  "ziprecruiter":    { label: "ZipRecruiter",      color: "#38bdf8",  bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.3)" },
  "remoteok":        { label: "RemoteOK",          color: "#fb923c",  bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.3)" },
  "remotive":        { label: "Remotive",          color: "#e879f9",  bg: "rgba(232,121,249,0.12)", border: "rgba(232,121,249,0.3)" },
  "google-jobs":     { label: "Google Jobs",       color: "#facc15",  bg: "rgba(250,204,21,0.12)",  border: "rgba(250,204,21,0.3)" },
  "crustdata":       { label: "Crustdata",         color: "#c084fc",  bg: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.3)" },
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
// ---------------------------------------------------------------------------
// PlatformFilterBar — multi-select source chips above job grids
// ---------------------------------------------------------------------------
function PlatformFilterBar({
  items, selected, onToggle, onClear
}: {
  items: { source?: string | null }[];
  selected: Set<string>;
  onToggle: (s: string) => void;
  onClear: () => void;
}) {
  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach(i => { const s = i.source || "unknown"; counts.set(s, (counts.get(s) || 0) + 1); });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  if (sources.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Filter className="w-3.5 h-3.5 text-[#BBC9CD] flex-shrink-0" />
      <button
        onClick={onClear}
        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
          selected.size === 0
            ? "bg-[#00FFFF]/15 border-[#00FFFF]/50 text-[#00FFFF]"
            : "bg-[#1A1A1A] border-[#00FFFF]/15 text-[#BBC9CD] hover:border-[#00FFFF]/35"
        }`}
      >
        All ({items.length})
      </button>
      {sources.map(([source, count]) => {
        const meta = getSourceMeta(source);
        const active = selected.has(source);
        return (
          <button
            key={source}
            onClick={() => onToggle(source)}
            className="px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
            style={{
              backgroundColor: active ? meta.bg : "rgba(26,26,26,0.8)",
              borderColor: active ? meta.border : "rgba(0,255,255,0.12)",
              color: active ? meta.color : "#BBC9CD",
            }}
          >
            {meta.label} ({count})
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DateFilterBar — filter by how recently jobs were scraped
// ---------------------------------------------------------------------------
const DATE_OPTIONS = [
  { label: "Today",      days: 1  },
  { label: "3 Days",     days: 3  },
  { label: "This Week",  days: 7  },
  { label: "This Month", days: 30 },
] as const;

function DateFilterBar({
  selected, onChange
}: {
  selected: number | null;
  onChange: (days: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <Clock className="w-3.5 h-3.5 text-[#BBC9CD] flex-shrink-0" />
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
          selected === null
            ? "bg-[#00FFFF]/15 border-[#00FFFF]/50 text-[#00FFFF]"
            : "bg-[#1A1A1A] border-[#00FFFF]/15 text-[#BBC9CD] hover:border-[#00FFFF]/35"
        }`}
      >
        Any time
      </button>
      {DATE_OPTIONS.map(({ label, days }) => (
        <button
          key={days}
          onClick={() => onChange(days)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
            selected === days
              ? "bg-[#00FFFF]/15 border-[#00FFFF]/50 text-[#00FFFF]"
              : "bg-[#1A1A1A] border-[#00FFFF]/15 text-[#BBC9CD] hover:border-[#00FFFF]/35"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function applyDateFilter<T extends { created_at?: string | null }>(items: T[], days: number | null): T[] {
  if (!days) return items;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter(i => {
    if (!i.created_at) return true; // no date = include
    return new Date(i.created_at).getTime() >= cutoff;
  });
}

import { campaignService } from "../../services/campaignService";
import { supabase } from "../../services/supabase";

import { Database } from "../../types/supabase";
import { fetchVllmStatus, triggerVllmWarmup } from "../../services/vllmService";
type Campaign = Database['public']['Tables']['campaigns']['Row'];
type InboxItem = Database['public']['Tables']['inbox_items']['Row'];

// ---------------------------------------------------------------------------
// ApplyModal — warmup-aware cover letter generation + review + submit
// Phases: checking → warming (polls) → generating → review → submitting
// ---------------------------------------------------------------------------
type ModalPhase = 'checking' | 'warming' | 'generating' | 'failed' | 'review' | 'submitting';

function ApplyModal({ job, campaign, onConfirm, onClose }: {
  job: InboxItem;
  campaign: Campaign | undefined;
  onConfirm: (coverLetter: string) => Promise<void>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<ModalPhase>('checking');
  const [coverLetter, setCoverLetter] = useState('');
  const [failReason, setFailReason] = useState('');
  const [warmupDots, setWarmupDots] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Animated dots for warmup label
  useEffect(() => {
    if (phase !== 'warming') return;
    const t = setInterval(() => setWarmupDots(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, [phase]);

  // Main orchestration: check status → warmup if needed → generate
  // retryCount in deps means a retry resets and reruns the whole flow
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    setPhase('checking');
    setFailReason('');

    const generate = async () => {
      if (cancelled) return;
      setPhase('generating');
      try {
        const text = await campaignService.generateCoverLetter(job.id);
        if (!cancelled) { setCoverLetter(text); setPhase('review'); }
      } catch (e: any) {
        if (!cancelled) {
          setFailReason(e?.message || 'The AI server returned an error.');
          setPhase('failed');
        }
      }
    };

    const pollUntilOnline = () => {
      if (cancelled) return;
      fetchVllmStatus().then(({ status }) => {
        if (cancelled) return;
        if (status === 'online') {
          generate();
        } else {
          setPhase('warming');
          pollTimer = setTimeout(pollUntilOnline, 5000);
        }
      }).catch(() => {
        if (!cancelled) {
          setPhase('warming');
          pollTimer = setTimeout(pollUntilOnline, 5000);
        }
      });
    };

    fetchVllmStatus().then(({ status }) => {
      if (cancelled) return;
      if (status === 'online') {
        generate();
      } else {
        triggerVllmWarmup().catch(() => {});
        setPhase('warming');
        pollTimer = setTimeout(pollUntilOnline, 5000);
      }
    }).catch(() => {
      if (!cancelled) {
        triggerVllmWarmup().catch(() => {});
        setPhase('warming');
        pollTimer = setTimeout(pollUntilOnline, 5000);
      }
    });

    return () => { cancelled = true; clearTimeout(pollTimer); };
  }, [job.id, retryCount]);

  const handleConfirm = async () => {
    setPhase('submitting');
    try {
      await onConfirm(coverLetter);
    } catch {
      setFailReason('Failed to submit application. Please try again.');
      setPhase('failed');
    }
  };

  const dots = '.'.repeat(warmupDots).padEnd(3, '\u00a0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0D0D0D] border border-[#00FFFF]/30 rounded-2xl shadow-[0_0_60px_rgba(0,255,255,0.15)] flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[#1A1A1A]">
          <div>
            <h2 className="text-xl font-bold text-[#DAE2FD] mb-1">{job.job_title}</h2>
            <p className="text-sm text-[#BBC9CD]">{job.company_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Checking status */}
          {phase === 'checking' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-[#00FFFF] animate-spin" />
              <p className="text-[#BBC9CD] text-sm">Checking AI server status…</p>
            </div>
          )}

          {/* Cold-start warmup */}
          {phase === 'warming' && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-[#00FFFF]/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-[#00FFFF]/40 animate-pulse" />
                <Sparkles className="w-8 h-8 text-[#00FFFF]" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold mb-1">GPU Server Warming Up{dots}</p>
                <p className="text-[#BBC9CD] text-sm max-w-xs">The AI instance is starting from cold. This usually takes 30–60 seconds. You can leave this open.</p>
              </div>
              <div className="w-full max-w-xs bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00FFFF]/50 to-[#00FFFF] rounded-full animate-[warmup_2s_ease-in-out_infinite]"
                  style={{ width: '60%', animation: 'pulse 2s ease-in-out infinite' }} />
              </div>
              <p className="text-xs text-[#BBC9CD]/60">Polling every 5 seconds…</p>
            </div>
          )}

          {/* Generating */}
          {phase === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-[#00FFFF] animate-spin" />
                <Sparkles className="w-5 h-5 text-[#00FFFF] absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold mb-1">Writing Your Cover Letter</p>
                <p className="text-[#BBC9CD] text-sm">Qwen is tailoring it to this role…</p>
              </div>
            </div>
          )}

          {/* Failed */}
          {phase === 'failed' && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold mb-2">Generation Failed</p>
                <p className="text-[#BBC9CD] text-sm max-w-sm">{failReason || 'Something went wrong. The server may still be warming up.'}</p>
              </div>
              <button
                onClick={() => setRetryCount(c => c + 1)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00FFFF]/15 hover:bg-[#00FFFF]/25 text-[#00FFFF] font-semibold border border-[#00FFFF]/30 transition-all"
              >
                <Loader2 className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={() => { setCoverLetter(''); setPhase('review'); }}
                className="text-xs text-[#BBC9CD] hover:text-white underline underline-offset-2 transition-colors"
              >
                Write manually instead
              </button>
            </div>
          )}

          {/* Review */}
          {(phase === 'review' || phase === 'submitting') && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs text-[#BBC9CD] mb-1">
                <Edit3 className="w-3.5 h-3.5 text-[#00FFFF]" />
                Review and edit your cover letter before submitting
              </div>
              <textarea
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
                disabled={phase === 'submitting'}
                rows={16}
                className="w-full bg-[#0A0A0A] border border-[#00FFFF]/20 rounded-xl p-4 text-sm text-[#DAE2FD] leading-relaxed resize-none focus:outline-none focus:border-[#00FFFF]/50 placeholder-[#BBC9CD]/40 disabled:opacity-60"
                placeholder="Your cover letter will appear here…"
              />
            </div>
          )}
        </div>

        {/* Footer — only shown when there's something to act on */}
        {(phase === 'review' || phase === 'submitting') && (
          <div className="flex gap-3 p-6 border-t border-[#1A1A1A]">
            <button
              onClick={onClose}
              disabled={phase === 'submitting'}
              className="flex-1 py-3 rounded-xl bg-[#1A1A1A] hover:bg-[#222] text-[#BBC9CD] font-semibold border border-[#00FFFF]/20 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={phase === 'submitting' || !coverLetter.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-green-500/30 to-green-600/30 hover:from-green-500/40 hover:to-green-600/40 text-green-400 font-semibold border border-green-500/40 transition-all disabled:opacity-50"
            >
              {phase === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {phase === 'submitting' ? 'Submitting…' : 'Confirm & Apply'}
            </button>
          </div>
        )}
        {(phase === 'checking' || phase === 'warming' || phase === 'generating' || phase === 'failed') && (
          <div className="p-6 border-t border-[#1A1A1A]">
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#1A1A1A] hover:bg-[#222] text-[#BBC9CD] font-semibold border border-[#00FFFF]/20 transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function JobsView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [uploadedCV, setUploadedCV] = useState<File | null>(null);
  const [applyJob, setApplyJob] = useState<InboxItem | null>(null);
  // Platform + date filters — campaign detail view
  const [campaignPlatformFilter, setCampaignPlatformFilter] = useState<Set<string>>(new Set());
  const [campaignDateFilter, setCampaignDateFilter] = useState<number | null>(null);
  // Platform + date filters — search results (main view)
  const [platformFilter, setPlatformFilter] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<number | null>(null);

  const togglePlatform = (filter: Set<string>, setFilter: (s: Set<string>) => void, source: string) => {
    const next = new Set(filter);
    if (next.has(source)) next.delete(source); else next.add(source);
    setFilter(next);
  };

  // New campaign form state
  const [newCampaign, setNewCampaign] = useState({
    name: "", keywords: "", location: "", salary: "", posted_within_days: "7"
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
            salary: newCampaign.salary,
            posted_within_days: newCampaign.posted_within_days || null,
          }
        });
        setCampaigns([created, ...campaigns]);
        setNewCampaign({ name: "", keywords: "", location: "", salary: "", posted_within_days: "7" });
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

  const handleApplyConfirm = useCallback(async (coverLetter: string) => {
    if (!applyJob) return;
    await campaignService.createApplication(applyJob.id, coverLetter);
    setInboxItems(prev => prev.filter(i => i.id !== applyJob.id));
    setApplyJob(null);
  }, [applyJob]);

  const activeCampaigns = campaigns.filter(c => c.status === "RUNNING" || c.status === "DRAFT").length;
  const pendingInbox = inboxItems.filter(i => i.status === "PENDING_REVIEW");

  // Pre-compute filtered items for campaign detail (hooks must be called unconditionally)
  const allCampaignItems = selectedCampaign
    ? inboxItems.filter(i => i.campaign_id === selectedCampaign.id)
    : [];
  const campaignItems = useMemo(() => {
    let items = applyDateFilter(allCampaignItems, campaignDateFilter);
    if (campaignPlatformFilter.size > 0)
      items = items.filter(i => campaignPlatformFilter.has(i.source || "unknown"));
    return items;
  }, [allCampaignItems, campaignDateFilter, campaignPlatformFilter]);

  // Pre-compute filtered search results
  const filteredPendingInbox = useMemo(() => {
    let items = applyDateFilter(pendingInbox, dateFilter);
    if (platformFilter.size > 0)
      items = items.filter(i => platformFilter.has(i.source || "unknown"));
    return items;
  }, [pendingInbox, dateFilter, platformFilter]);

  // If a campaign is selected, show detailed view
  if (selectedCampaign) {
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
                <div className="font-semibold text-white">{inboxItems.filter(i => i.campaign_id === selectedCampaign.id).length} jobs</div>
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

          {/* Matched Jobs — platform + date filters */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
              <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                Matched Opportunities ({campaignItems.length}{campaignPlatformFilter.size > 0 || campaignDateFilter ? ` filtered` : ""})
              </span>
            </div>

            <DateFilterBar selected={campaignDateFilter} onChange={setCampaignDateFilter} />
            <PlatformFilterBar
              items={allCampaignItems}
              selected={campaignPlatformFilter}
              onToggle={(s) => togglePlatform(campaignPlatformFilter, setCampaignPlatformFilter, s)}
              onClear={() => setCampaignPlatformFilter(new Set())}
            />

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
                    <div className="h-48 overflow-y-auto mb-3 pr-1 prose prose-sm prose-invert max-w-none
                      [&>p]:text-[#BBC9CD] [&>p]:text-sm [&>p]:leading-relaxed [&>p]:mb-2
                      [&>ul]:text-[#BBC9CD] [&>ul]:text-sm [&>ul]:pl-4 [&>ul]:mb-2
                      [&>li]:mb-0.5 [&>h3]:text-white [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1">
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
                        onClick={() => setApplyJob(job)}
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
    <>
    {applyJob && (
      <ApplyModal
        job={applyJob}
        campaign={campaigns.find(c => c.id === applyJob.campaign_id)}
        onConfirm={handleApplyConfirm}
        onClose={() => setApplyJob(null)}
      />
    )}
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

                <div>
                  <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#00FFFF]" />
                      Posted Within
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "24 Hours", value: "1" },
                      { label: "3 Days",   value: "3" },
                      { label: "1 Week",   value: "7" },
                      { label: "1 Month",  value: "30" },
                      { label: "Any time", value: "" },
                    ].map(({ label, value }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setNewCampaign({ ...newCampaign, posted_within_days: value })}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                          newCampaign.posted_within_days === value
                            ? "bg-[#00FFFF]/20 border-[#00FFFF]/50 text-[#00FFFF]"
                            : "bg-[#0A0A0A]/50 border-[#00FFFF]/15 text-[#BBC9CD] hover:border-[#00FFFF]/35"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
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
                        {inboxItems.filter(i => i.campaign_id === campaign.id).length} results
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

        {/* Job Results Inbox (HITL) — platform + date filters */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
            <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
              Search Results ({filteredPendingInbox.length}{platformFilter.size > 0 || dateFilter ? " filtered" : ""})
            </span>
          </div>

          <DateFilterBar selected={dateFilter} onChange={setDateFilter} />
          <PlatformFilterBar
            items={pendingInbox}
            selected={platformFilter}
            onToggle={(s) => togglePlatform(platformFilter, setPlatformFilter, s)}
            onClear={() => setPlatformFilter(new Set())}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPendingInbox.length === 0 && (
              <div className="col-span-full text-center py-6 text-[#BBC9CD]">
                {pendingInbox.length > 0 ? "No results match the selected filters." : "No new search results."}
              </div>
            )}
            {filteredPendingInbox.map((job) => {
              const src = getSourceMeta(job.source);
              const prefs = campaigns.find(c => c.id === job.campaign_id)?.job_preferences as any;
              return (
                <GlassCard key={job.id} className="!p-5 hover:border-[#00FFFF]/40 transition-all flex flex-col">
                  {/* Source badge + match score */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-md"
                      style={{ color: src.color, backgroundColor: src.bg, border: `1px solid ${src.border}` }}>
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
                      <p className="text-sm text-[#BBC9CD] truncate">{job.company_name} · {job.remote_type || "remote"}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-3 text-xs mb-3">
                    <div className="flex items-center gap-1 text-[#BBC9CD]">
                      <MapPin className="w-3.5 h-3.5 text-[#00FFFF]" />
                      {job.location || "Anywhere"}
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

                  {/* Description */}
                  <div className="h-48 overflow-y-auto mb-3 pr-1 prose prose-sm prose-invert max-w-none
                    [&>p]:text-[#BBC9CD] [&>p]:text-sm [&>p]:leading-relaxed [&>p]:mb-2
                    [&>ul]:text-[#BBC9CD] [&>ul]:text-sm [&>ul]:pl-4 [&>ul]:mb-2
                    [&>li]:mb-0.5 [&>h3]:text-white [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1
                    [&>strong]:text-white">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                      {htmlToMarkdown(job.job_description || "") || "No description available."}
                    </ReactMarkdown>
                  </div>

                  {/* Why This Matches */}
                  <div className="bg-[#0A0A0A]/50 rounded-lg p-3 border border-[#00FFFF]/10 mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3.5 h-3.5 text-[#00FFFF]" />
                      <span className="font-semibold text-white text-xs">Why This Matches</span>
                    </div>
                    {prefs?.keywords && (
                      <div className="flex items-center gap-1.5 text-xs text-[#BBC9CD]">
                        <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                        Keywords: {prefs.keywords}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-[#BBC9CD] mt-1">
                      <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                      Sourced from {src.label} {src.label !== "Unknown" ? "feed." : "source."}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => window.open(job.job_url, '_blank')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 hover:from-[#00FFFF]/30 hover:to-[#0099CC]/30 text-[#00FFFF] text-sm font-semibold border border-[#00FFFF]/40 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => setApplyJob(job)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-semibold border border-green-500/30 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Apply
                    </button>
                    <button
                      onClick={() => handleInboxAction(job.id, 'REJECTED')}
                      className="p-2 rounded-lg bg-[#1A1A1A]/50 hover:bg-red-500/20 text-[#BBC9CD] hover:text-red-400 border border-[#00FFFF]/20 hover:border-red-500/40 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
