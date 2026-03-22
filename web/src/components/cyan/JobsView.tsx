import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useOutletContext } from "react-router";
import {
  Menu, Briefcase, Search, MapPin, DollarSign, Building2,
  Clock, ExternalLink, Sparkles, Plus, X, Send, Inbox, Check, XCircle,
  ArrowLeft, Upload, FileText, Target, TrendingUp, Award, Zap, Loader2, Filter,
  ChevronRight, BookOpen, MessageSquare, Trash2
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
  "cvlibrary":       { label: "CV-Library",        color: "#f472b6",  bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.3)" },
  "ziprecruiter":    { label: "ZipRecruiter",      color: "#38bdf8",  bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.3)" },
  "remoteok":        { label: "RemoteOK",          color: "#fb923c",  bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.3)" },
  "remotive":        { label: "Remotive",          color: "#e879f9",  bg: "rgba(232,121,249,0.12)", border: "rgba(232,121,249,0.3)" },
  "google-jobs":     { label: "Google Jobs",       color: "#facc15",  bg: "rgba(250,204,21,0.12)",  border: "rgba(250,204,21,0.3)" },
  "crustdata":       { label: "Crustdata",         color: "#c084fc",  bg: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.3)" },
  "adzuna":          { label: "Adzuna",             color: "#f97316",  bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.3)" },
  "jobicy":          { label: "Jobicy",             color: "#818cf8",  bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.3)" },
  "himalayas":       { label: "Himalayas",          color: "#2dd4bf",  bg: "rgba(45,212,191,0.12)",  border: "rgba(45,212,191,0.3)" },
  "reed":            { label: "Reed",               color: "#f87171",  bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
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
function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
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

const JOB_TYPE_OPTIONS = [
  { label: "Any type",    value: "" },
  { label: "Full-time",   value: "full-time" },
  { label: "Part-time",   value: "part-time" },
  { label: "Contract",    value: "contract" },
  { label: "Freelance",   value: "freelance" },
];

const ARRANGEMENT_OPTIONS = [
  { label: "Any arrangement", value: "" },
  { label: "Remote",          value: "remote" },
  { label: "Hybrid",          value: "hybrid" },
  { label: "On-site",         value: "onsite" },
];

// ---------------------------------------------------------------------------
// FilterRow — compact single-line filter bar with <select> dropdowns
// ---------------------------------------------------------------------------
const SELECT_CLS =
  "px-3 py-1.5 rounded-lg bg-[#0D0D0D] border border-[#00FFFF]/20 text-[#BBC9CD] text-xs " +
  "font-semibold focus:outline-none focus:border-[#00FFFF]/50 cursor-pointer appearance-none pr-7 " +
  "transition-colors hover:border-[#00FFFF]/40";

function FilterRow({
  dateSelected, onDateChange,
  typeSelected, onTypeChange,
  arrangementSelected, onArrangementChange,
}: {
  dateSelected: number | null; onDateChange: (v: number | null) => void;
  typeSelected: string; onTypeChange: (v: string) => void;
  arrangementSelected: string; onArrangementChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <Clock className="w-3.5 h-3.5 text-[#BBC9CD]/60 flex-shrink-0" />
      <div className="relative">
        <select
          value={dateSelected ?? ""}
          onChange={e => onDateChange(e.target.value ? Number(e.target.value) : null)}
          className={SELECT_CLS}
          style={{ backgroundImage: "none" }}
        >
          <option value="">Any time</option>
          <option value="1">Today</option>
          <option value="3">3 Days</option>
          <option value="7">This Week</option>
          <option value="30">This Month</option>
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#BBC9CD]/50 text-[10px]">▾</span>
      </div>
      <div className="relative">
        <select
          value={typeSelected}
          onChange={e => onTypeChange(e.target.value)}
          className={SELECT_CLS}
          style={{ backgroundImage: "none" }}
        >
          {JOB_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#BBC9CD]/50 text-[10px]">▾</span>
      </div>
      <div className="relative">
        <select
          value={arrangementSelected}
          onChange={e => onArrangementChange(e.target.value)}
          className={SELECT_CLS}
          style={{ backgroundImage: "none" }}
        >
          {ARRANGEMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#BBC9CD]/50 text-[10px]">▾</span>
      </div>
    </div>
  );
}

function applyDateFilter<T extends { job_posted_at?: string | null; discovered_at?: string | null }>(items: T[], days: number | null): T[] {
  if (!days) return items;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter(i => {
    // Prefer actual job posting date; fall back to when we scraped it
    const dateStr = i.job_posted_at || i.discovered_at;
    if (!dateStr) return true;
    return new Date(dateStr).getTime() >= cutoff;
  });
}

import { campaignService } from "../../services/campaignService";
import { supabase } from "../../services/supabase";

import { Database } from "../../types/supabase";
type Campaign = Database['public']['Tables']['campaigns']['Row'];
type InboxItem = Database['public']['Tables']['inbox_items']['Row'];

// ---------------------------------------------------------------------------
// ApplyModal — fire-and-forget: create application immediately, generate cover
// letter in the background. Show CV mismatch warning if needed, then submit.
// Phases: cv-check → cv-mismatch? → submitting → success
// ---------------------------------------------------------------------------
type ModalPhase = 'cv-check' | 'cv-mismatch' | 'submitting' | 'success';

/** Simple keyword-overlap relevance check — no API call needed */
function scoreCVRelevance(cvText: string, jobTitle: string, jobDesc: string): { score: number; missing: string[] } {
  const jobWords = (jobTitle + " " + jobDesc)
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 4)
    .filter((w, i, a) => a.indexOf(w) === i)
    .slice(0, 40);
  const cv = cvText.toLowerCase();
  const matched = jobWords.filter(w => cv.includes(w));
  const missing = jobWords.filter(w => !cv.includes(w)).slice(0, 6);
  return { score: matched.length / Math.max(jobWords.length, 1), missing };
}

function ApplyModal({ job, onConfirm, onClose }: {
  job: InboxItem;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<ModalPhase>('cv-check');
  const [mismatchInfo, setMismatchInfo] = useState<{ score: number; missing: string[] } | null>(null);

  // On mount: fetch CV and score relevance
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cv = await campaignService.getPrimaryCV();
        if (cancelled) return;
        if (cv) {
          const { score, missing } = scoreCVRelevance(
            cv.parsed_text,
            job.job_title || '',
            job.job_description || ''
          );
          if (score < 0.15) {
            setMismatchInfo({ score, missing });
            setPhase('cv-mismatch');
            return;
          }
        }
      } catch { /* fail open */ }
      if (!cancelled) handleSubmit();
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const handleSubmit = async () => {
    setPhase('submitting');
    try {
      await campaignService.createApplication(job.id, "");
      setPhase('success');
      setTimeout(onConfirm, 1500);
    } catch (e: any) {
      // If creation fails, close the modal — don't leave user stuck
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0D0D0D] border border-[#00FFFF]/30 rounded-2xl shadow-[0_0_60px_rgba(0,255,255,0.15)] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[#1A1A1A]">
          <div>
            <h2 className="text-lg font-bold text-[#DAE2FD] mb-1">{job.job_title}</h2>
            <p className="text-sm text-[#BBC9CD]">{job.company_name}</p>
          </div>
          {phase !== 'submitting' && phase !== 'success' && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">

          {/* CV check loading */}
          {phase === 'cv-check' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 text-[#00FFFF] animate-spin" />
              <p className="text-[#BBC9CD] text-sm">Checking CV relevance…</p>
            </div>
          )}

          {/* Submitting */}
          {phase === 'submitting' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 text-[#00FFFF] animate-spin" />
              <p className="text-[#BBC9CD] text-sm">Saving application…</p>
            </div>
          )}

          {/* Success */}
          {phase === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                <Check className="w-7 h-7 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold mb-1">Application Saved!</p>
                <p className="text-sm text-[#BBC9CD]">Cover letter is being generated in the background.</p>
                <p className="text-xs text-[#BBC9CD]/60 mt-1">Check the Applications tab to review it.</p>
              </div>
            </div>
          )}

          {/* CV mismatch warning */}
          {phase === 'cv-mismatch' && mismatchInfo && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-yellow-500/8 border border-yellow-500/30">
                <div className="p-2.5 rounded-lg bg-yellow-500/15 flex-shrink-0">
                  <Award className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-yellow-300 mb-1">CV May Not Match This Job</p>
                  <p className="text-sm text-[#BBC9CD] leading-relaxed">
                    Your active CV has low overlap with this role ({Math.round(mismatchInfo.score * 100)}% keyword match).
                    The cover letter will still be generated - you can edit it in the Applications tab.
                  </p>
                </div>
              </div>
              {mismatchInfo.missing.length > 0 && (
                <div className="bg-[#0A0A0A]/60 rounded-xl p-4 border border-[#00FFFF]/10">
                  <p className="text-xs font-semibold text-[#BBC9CD]/70 uppercase tracking-widest mb-2">Keywords not in your CV</p>
                  <div className="flex flex-wrap gap-2">
                    {mismatchInfo.missing.map(w => (
                      <span key={w} className="px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/25 text-xs text-red-300">{w}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === 'cv-mismatch' && (
          <div className="flex gap-3 p-6 border-t border-[#1A1A1A]">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#1A1A1A] hover:bg-[#222] text-[#BBC9CD] font-semibold border border-[#00FFFF]/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-green-500/30 to-green-600/30 hover:from-green-500/40 hover:to-green-600/40 text-green-400 font-semibold border border-green-500/40 transition-all"
            >
              <Send className="w-4 h-4" />
              Apply Anyway
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MemoJobCard — memoized so it only re-renders when its own job data changes,
// not when the parent filter state changes. Prevents ReactMarkdown from
// re-parsing descriptions on every filter click.
// ---------------------------------------------------------------------------
const MemoJobCard = memo(function JobCard({
  job, prefs, onApply, onAction, onView, showReject
}: {
  job: InboxItem;
  prefs?: Record<string, any>;
  onApply: (job: InboxItem) => void;
  onAction?: (id: string, action: "APPROVED" | "REJECTED") => void;
  onView: (url: string) => void;
  showReject?: boolean;
}) {
  const src = getSourceMeta(job.source);
  const descMarkdown = useMemo(() => htmlToMarkdown(job.job_description || ""), [job.job_description]);
  return (
    <GlassCard className="!p-5 hover:border-[#00FFFF]/40 transition-all flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-bold px-2 py-1 rounded-md"
          style={{ color: src.color, backgroundColor: src.bg, border: `1px solid ${src.border}` }}>
          {src.label}
        </span>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/15 border border-green-500/25">
          <Sparkles className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-bold text-green-400">{job.match_score ? Math.round(job.match_score * 100) : 0}%</span>
        </div>
      </div>

      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00FFFF]/20 to-[#0099CC]/20 border border-[#00FFFF]/30 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-[#00FFFF]" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-[#DAE2FD] text-base leading-tight mb-0.5 truncate">{job.job_title}</h3>
          <p className="text-sm text-[#BBC9CD] truncate">{job.company_name} · {job.remote_type || "remote"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs mb-3">
        <span className="flex items-center gap-1 text-[#BBC9CD]"><MapPin className="w-3.5 h-3.5 text-[#00FFFF]" />{job.location || "Anywhere"}</span>
        <span className="flex items-center gap-1 text-[#BBC9CD]"><DollarSign className="w-3.5 h-3.5 text-[#00FFFF]" />{job.salary_range || "Undisclosed"}</span>
        <span className="flex items-center gap-1 text-[#BBC9CD]"><Clock className="w-3.5 h-3.5 text-[#00FFFF]" />{(job as any).job_posted_at ? relativeDate((job as any).job_posted_at) : job.discovered_at ? relativeDate(job.discovered_at) : "Recently"}</span>
      </div>

      <div className="h-48 overflow-y-auto mb-3 pr-1 prose prose-sm prose-invert max-w-none
        [&>p]:text-[#BBC9CD] [&>p]:text-sm [&>p]:leading-relaxed [&>p]:mb-2
        [&>ul]:text-[#BBC9CD] [&>ul]:text-sm [&>ul]:pl-4 [&>ul]:mb-2
        [&>li]:mb-0.5 [&>h3]:text-white [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1 [&>strong]:text-white">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {descMarkdown || "No description available."}
        </ReactMarkdown>
      </div>

      <div className="bg-[#0A0A0A]/50 rounded-lg p-3 border border-[#00FFFF]/10 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3.5 h-3.5 text-[#00FFFF]" />
          <span className="font-semibold text-white text-xs">Why This Matches</span>
        </div>
        {prefs?.keywords && (
          <div className="flex items-start gap-1.5 text-xs text-[#BBC9CD]">
            <Check className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
            Keywords: {prefs.keywords}
          </div>
        )}
        {job.match_reasoning && (
          <div className="flex items-start gap-1.5 text-xs text-[#BBC9CD] mt-1">
            <Check className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
            {job.match_reasoning}
          </div>
        )}
        {!prefs?.keywords && !job.match_reasoning && (
          <div className="flex items-center gap-1.5 text-xs text-[#BBC9CD]">
            <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
            Sourced from {src.label}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onView(job.job_url || "")}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#00FFFF]/15 to-[#0099CC]/15 hover:from-[#00FFFF]/25 hover:to-[#0099CC]/25 text-[#00FFFF] text-xs font-semibold transition-all border border-[#00FFFF]/30"
        >
          <ExternalLink className="w-3.5 h-3.5" />View
        </button>
        <button
          onClick={() => onApply(job)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-semibold transition-colors border border-green-500/25"
        >
          <Send className="w-3.5 h-3.5" />Apply
        </button>
        {showReject && onAction && (
          <button
            onClick={() => onAction(job.id, "REJECTED")}
            className="p-2 rounded-lg bg-[#1A1A1A]/50 hover:bg-red-500/20 text-[#BBC9CD] hover:text-red-400 border border-[#00FFFF]/20 hover:border-red-500/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </GlassCard>
  );
});

// ---------------------------------------------------------------------------
// Status badge helper for applications
// ---------------------------------------------------------------------------
const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  READY_TO_APPLY:   { label: "Ready to Apply",  color: "#facc15",  bg: "rgba(250,204,21,0.12)",  border: "rgba(250,204,21,0.3)" },
  APPLIED:          { label: "Applied",          color: "#4ade80",  bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)" },
  INTERVIEWING:     { label: "Interviewing",     color: "#60a5fa",  bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)" },
  OFFER_RECEIVED:   { label: "Offer Received",   color: "#00FFFF",  bg: "rgba(0,255,255,0.12)",   border: "rgba(0,255,255,0.3)" },
  REJECTED:         { label: "Rejected",         color: "#f87171",  bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
  WITHDRAWN:        { label: "Withdrawn",        color: "#BBC9CD",  bg: "rgba(187,201,205,0.10)", border: "rgba(187,201,205,0.2)" },
};

function getStatusMeta(status?: string | null) {
  if (!status) return STATUS_META["READY_TO_APPLY"];
  return STATUS_META[status] ?? { label: status, color: "#BBC9CD", bg: "rgba(187,201,205,0.1)", border: "rgba(187,201,205,0.2)" };
}

// ---------------------------------------------------------------------------
// ApplicationDetailModal
// ---------------------------------------------------------------------------
function ApplicationDetailModal({
  application,
  onClose,
  onConfirmApplied,
  onGenerateQuestions,
  isGeneratingQuestions,
  onDelete,
  onGenerateCoverLetter,
  isGeneratingCoverLetter,
}: {
  application: any;
  onClose: () => void;
  onConfirmApplied: (appId: string) => Promise<void>;
  onGenerateQuestions: (appId: string) => Promise<void>;
  isGeneratingQuestions: boolean;
  onDelete: (appId: string) => Promise<void>;
  onGenerateCoverLetter: (appId: string) => Promise<void>;
  isGeneratingCoverLetter: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'job' | 'description' | 'cover-letter' | 'interview'>('job');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const metadata = application.cover_letter_metadata || {};
  const snapshot = metadata.job_snapshot || {};
  const questions: string[] = metadata.interview_questions || [];
  const status = application.status;
  const statusMeta = getStatusMeta(status);

  // Prefer snapshot fields (survive after inbox_item deletion) with fallback to joined inbox_items
  const jobTitle = snapshot.job_title || application.inbox_items?.job_title || "Unknown Role";
  const company = snapshot.company_name || application.inbox_items?.company_name || "Unknown Company";
  const location = snapshot.location || application.inbox_items?.location;
  const remoteType = snapshot.remote_type || application.inbox_items?.remote_type;
  const salary = snapshot.salary_range || application.inbox_items?.salary_range;
  const jobUrl = snapshot.job_url || application.inbox_items?.job_url;
  const jobDescription = snapshot.job_description || application.inbox_items?.job_description || "";
  const source = snapshot.source || application.inbox_items?.source;
  const matchScore = snapshot.match_score ?? application.inbox_items?.match_score;
  const srcMeta = getSourceMeta(source);
  const descMarkdown = htmlToMarkdown(jobDescription);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirmApplied(application.id);
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setConfirmingDelete(false);
    try {
      await onDelete(application.id);
    } finally {
      setDeleting(false);
    }
  };

  const TABS = [
    { id: 'job' as const, label: 'Job Info', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'description' as const, label: 'Description', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'cover-letter' as const, label: 'Cover Letter', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'interview' as const, label: 'Interview Prep', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0D0D0D] border border-[#00FFFF]/30 rounded-2xl shadow-[0_0_60px_rgba(0,255,255,0.15)] flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[#1A1A1A]">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[#DAE2FD] mb-1 truncate">{jobTitle}</h2>
            <p className="text-sm text-[#BBC9CD]">{company}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-white transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status strip */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-[#1A1A1A] bg-[#0A0A0A]/40">
          <span
            className="px-3 py-1 rounded-lg text-xs font-bold border"
            style={{ color: statusMeta.color, backgroundColor: statusMeta.bg, borderColor: statusMeta.border }}
          >
            {statusMeta.label}
          </span>
          {application.applied_at && (
            <span className="text-xs text-[#BBC9CD]/60 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Applied {relativeDate(application.applied_at)}
            </span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {status === 'READY_TO_APPLY' && (
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-semibold border border-green-500/30 transition-all disabled:opacity-50"
              >
                {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Mark as Applied
              </button>
            )}
            {confirmingDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#BBC9CD]">Delete this application?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold border border-red-500/40 transition-all disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-[#BBC9CD] text-xs font-semibold border border-[#00FFFF]/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                title="Delete application"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1A1A1A] px-6 gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-[#00FFFF] text-[#00FFFF]'
                  : 'border-transparent text-[#BBC9CD] hover:text-[#DAE2FD]'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Job Info tab */}
          {activeTab === 'job' && (
            <div className="space-y-3">
              {[
                { label: "Job Title", value: jobTitle, icon: <Briefcase className="w-4 h-4 text-[#00FFFF]" /> },
                { label: "Company", value: company, icon: <Building2 className="w-4 h-4 text-[#00FFFF]" /> },
                { label: "Location", value: location, icon: <MapPin className="w-4 h-4 text-[#00FFFF]" /> },
                { label: "Work Type", value: remoteType, icon: <Target className="w-4 h-4 text-[#00FFFF]" /> },
                { label: "Salary", value: salary, icon: <DollarSign className="w-4 h-4 text-[#00FFFF]" /> },
              ].filter(r => r.value).map(row => (
                <div key={row.label} className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0A0A]/60 border border-[#00FFFF]/10">
                  {row.icon}
                  <span className="text-xs text-[#BBC9CD]/70 w-20 flex-shrink-0">{row.label}</span>
                  <span className="text-sm text-[#DAE2FD] font-semibold">{row.value}</span>
                </div>
              ))}
              {source && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0A0A]/60 border border-[#00FFFF]/10">
                  <Sparkles className="w-4 h-4 text-[#00FFFF]" />
                  <span className="text-xs text-[#BBC9CD]/70 w-20 flex-shrink-0">Source</span>
                  <span className="text-xs font-bold px-2 py-1 rounded-md"
                    style={{ color: srcMeta.color, backgroundColor: srcMeta.bg, border: `1px solid ${srcMeta.border}` }}>
                    {srcMeta.label}
                  </span>
                  {matchScore != null && (
                    <span className="text-xs font-bold text-green-400 ml-auto">{Math.round(matchScore * 100)}% match</span>
                  )}
                </div>
              )}
              {jobUrl && (
                <a
                  href={jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00FFFF]/10 hover:bg-[#00FFFF]/20 text-[#00FFFF] text-sm font-semibold border border-[#00FFFF]/30 transition-all w-full"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Original Job Posting
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </a>
              )}
            </div>
          )}

          {/* Description tab */}
          {activeTab === 'description' && (
            <div className="prose prose-sm prose-invert max-w-none
              [&>p]:text-[#BBC9CD] [&>p]:text-sm [&>p]:leading-relaxed [&>p]:mb-2
              [&>ul]:text-[#BBC9CD] [&>ul]:text-sm [&>ul]:pl-4 [&>ul]:mb-2
              [&>li]:mb-0.5 [&>h3]:text-white [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1
              [&>strong]:text-white">
              {descMarkdown ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                  {descMarkdown}
                </ReactMarkdown>
              ) : (
                <p className="text-[#BBC9CD]/60 italic">No job description available.</p>
              )}
            </div>
          )}

          {/* Cover Letter tab */}
          {activeTab === 'cover-letter' && (() => {
            const clText = application.cover_letter_text;
            // "" = background task in progress; null/undefined = never triggered; string = ready
            const isBackgroundPending = clText === "" || clText === null || clText === undefined
              ? clText === ""
              : false;
            const hasLetter = typeof clText === 'string' && clText.trim().length > 0;
            const neverGenerated = clText == null;

            if (hasLetter) return (
              <div>
                <p className="text-xs text-[#BBC9CD]/60 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#00FFFF]" />
                  Generated cover letter - read only
                </p>
                <pre className="text-sm text-[#DAE2FD] leading-relaxed whitespace-pre-wrap font-sans bg-[#0A0A0A]/60 rounded-xl p-4 border border-[#00FFFF]/10">
                  {clText}
                </pre>
              </div>
            );

            if (isBackgroundPending || isGeneratingCoverLetter) return (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative flex items-center justify-center w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-[#00FFFF]/20 animate-ping" />
                  <Loader2 className="w-7 h-7 text-[#00FFFF] animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold mb-1">AI is thinking...</p>
                  <p className="text-sm text-[#BBC9CD]/70">Qwen is writing your cover letter in the background.</p>
                  <p className="text-xs text-[#BBC9CD]/50 mt-1">Refresh the page in a moment to see it.</p>
                </div>
              </div>
            );

            // neverGenerated or empty after failed background task
            return (
              <div className="flex flex-col items-center justify-center py-12 gap-5">
                <div className="w-14 h-14 rounded-full bg-[#00FFFF]/10 border border-[#00FFFF]/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#00FFFF]" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold mb-1">No cover letter yet</p>
                  <p className="text-sm text-[#BBC9CD]/70">Generate a tailored cover letter using your CV.</p>
                </div>
                <button
                  onClick={() => onGenerateCoverLetter(application.id)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00FFFF]/15 hover:bg-[#00FFFF]/25 text-[#00FFFF] font-semibold border border-[#00FFFF]/30 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Cover Letter
                </button>
              </div>
            );
          })()}

          {/* Interview Prep tab */}
          {activeTab === 'interview' && (
            <div>
              {questions.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-[#BBC9CD]/70 uppercase tracking-widest mb-4">
                    Interview Questions
                  </p>
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-[#0A0A0A]/60 border border-[#00FFFF]/10">
                      <span className="text-xs font-bold text-[#00FFFF] bg-[#00FFFF]/10 rounded-md px-2 py-1 flex-shrink-0 mt-0.5">
                        Q{i + 1}
                      </span>
                      <p className="text-sm text-[#DAE2FD] leading-relaxed">{q}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-5">
                  <div className="p-4 rounded-2xl bg-[#00FFFF]/10 border border-[#00FFFF]/20">
                    <MessageSquare className="w-8 h-8 text-[#00FFFF]" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-[#DAE2FD] mb-2">No interview questions yet</p>
                    <p className="text-sm text-[#BBC9CD] max-w-xs">
                      Let Qwen generate 7 tailored questions: role-specific technical questions plus personal achievement and career goal questions based on your CV.
                    </p>
                  </div>
                  <button
                    onClick={() => onGenerateQuestions(application.id)}
                    disabled={isGeneratingQuestions}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00FFFF]/15 hover:bg-[#00FFFF]/25 text-[#00FFFF] font-semibold border border-[#00FFFF]/30 transition-all disabled:opacity-50"
                  >
                    {isGeneratingQuestions
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                      : <><Sparkles className="w-4 h-4" />Generate 7 Interview Questions</>
                    }
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CV keyword extraction — scans parsed CV text for known tech/role terms
// ---------------------------------------------------------------------------
const CV_KEYWORD_BANK = [
  // Roles
  "fullstack", "full stack", "frontend", "front end", "backend", "back end",
  "software engineer", "senior engineer", "lead engineer", "staff engineer",
  "principal engineer", "engineering manager", "tech lead", "solutions architect",
  "data engineer", "ml engineer", "ai engineer", "devops engineer", "platform engineer",
  "product manager", "product designer", "ux designer", "data scientist", "data analyst",
  // Languages
  "python", "typescript", "javascript", "java", "golang", "go", "rust",
  "kotlin", "swift", "c#", "c++", "ruby", "php", "scala",
  // Frameworks / Libraries
  "react", "next.js", "nextjs", "vue", "angular", "node", "fastapi",
  "django", "flask", "spring", "rails", "laravel", ".net",
  "react native", "flutter", "expo",
  // AI / Data
  "machine learning", "deep learning", "llm", "nlp", "computer vision",
  "pytorch", "tensorflow", "hugging face", "langchain", "rag",
  "data science", "analytics", "spark", "kafka", "airflow",
  // Cloud / Infra
  "aws", "gcp", "azure", "cloud", "docker", "kubernetes", "terraform",
  "ci/cd", "devops", "mlops", "serverless",
  // Databases
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "supabase",
  "dynamodb", "bigquery", "snowflake",
  // Other
  "graphql", "rest api", "microservices", "agile", "scrum",
  "contract", "freelance", "remote",
];

function extractCVKeywords(cvText: string): string[] {
  const lower = cvText.toLowerCase();
  const found: string[] = [];
  for (const term of CV_KEYWORD_BANK) {
    if (lower.includes(term) && !found.includes(term)) found.push(term);
    if (found.length >= 14) break;
  }
  return found;
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
  // Filters — campaign detail view
  const [campaignPlatformFilter, setCampaignPlatformFilter] = useState<Set<string>>(new Set());
  const [campaignDateFilter, setCampaignDateFilter] = useState<number | null>(null);
  const [campaignJobTypeFilter, setCampaignJobTypeFilter] = useState("");
  const [campaignArrangementFilter, setCampaignArrangementFilter] = useState("");
  // Filters — search results (main view)
  const [platformFilter, setPlatformFilter] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<number | null>(null);
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [arrangementFilter, setArrangementFilter] = useState("");

  const togglePlatform = (filter: Set<string>, setFilter: (s: Set<string>) => void, source: string) => {
    const next = new Set(filter);
    if (next.has(source)) next.delete(source); else next.add(source);
    setFilter(next);
  };

  const [applicationsCount, setApplicationsCount] = useState(0);
  const [applications, setApplications] = useState<any[]>([]);
  const [viewingApplication, setViewingApplication] = useState<any | null>(null);
  const [generatingQuestionsFor, setGeneratingQuestionsFor] = useState<string | null>(null);
  const [generatingCoverLetterFor, setGeneratingCoverLetterFor] = useState<string | null>(null);
  const [cvs, setCvs] = useState<any[]>([]);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [viewingCV, setViewingCV] = useState<{ id: string; filename: string; text: string } | null>(null);
  const [loadingCVId, setLoadingCVId] = useState<string | null>(null);

  // New campaign form state
  const [newCampaign, setNewCampaign] = useState({
    name: "", keywords: "", location: "", salary: "",
    posted_within_days: "7", job_type: "", work_arrangement: ""
  });
  const [cvKeywordSuggestions, setCvKeywordSuggestions] = useState<string[]>([]);

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
      const [dbCampaigns, dbInbox, dbApplications, dbCVs] = await Promise.all([
        campaignService.getCampaigns(),
        campaignService.getInboxItems(),
        campaignService.getApplications(),
        campaignService.listCVs(),
      ]);
      setCampaigns(dbCampaigns);
      setInboxItems(dbInbox);
      setApplications(dbApplications);
      setApplicationsCount(dbApplications.length);
      setCvs(dbCVs);
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
    if (!newCampaign.name || !newCampaign.keywords) return;
    if (!uploadedCV && cvs.length === 0) return; // still need at least one CV
    try {
      // 1. Upload new CV if one was selected, otherwise reuse the existing primary
      if (uploadedCV) {
        const cvResult = await campaignService.uploadCV(uploadedCV);
        setCvs(prev => [cvResult.cv, ...prev.map(c => ({ ...c, is_primary: false }))]);
      }

      // 2. Create campaign
      const created = await campaignService.createCampaign({
        name: newCampaign.name,
        job_preferences: {
          keywords: newCampaign.keywords,
          location: newCampaign.location,
          salary: newCampaign.salary,
          posted_within_days: newCampaign.posted_within_days || null,
          job_type: newCampaign.job_type || null,
          work_arrangement: newCampaign.work_arrangement || null,
        }
      });
      setCampaigns([created, ...campaigns]);
      setNewCampaign({ name: "", keywords: "", location: "", salary: "",
        posted_within_days: "7", job_type: "", work_arrangement: "" });
      setUploadedCV(null);
      setCvKeywordSuggestions([]);
      setShowNewCampaign(false);

      // 3. Kick off scraping in background
      await campaignService.triggerScrapeRun(created.id);
    } catch (e) {
      console.error("Failed creating campaign", e);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await campaignService.deleteCampaign(campaignId);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      setInboxItems(prev => prev.filter(i => i.campaign_id !== campaignId));
      setDeletingCampaignId(null);
    } catch (e) {
      console.error("Failed to delete campaign", e);
    }
  };

  const handleDeleteCV = async (cvId: string) => {
    try {
      await campaignService.deleteCV(cvId);
      setCvs(prev => prev.filter(c => c.id !== cvId));
    } catch (e) {
      console.error("Failed to delete CV", e);
    }
  };

  const handleSetPrimaryCV = async (cvId: string) => {
    try {
      await campaignService.setPrimaryCV(cvId);
      setCvs(prev => prev.map(c => ({ ...c, is_primary: c.id === cvId })));
    } catch (e) {
      console.error("Failed to set primary CV", e);
    }
  };

  const handleViewCV = async (cv: any) => {
    setLoadingCVId(cv.id);
    try {
      const full = await campaignService.getCV(cv.id);
      setViewingCV({ id: cv.id, filename: cv.filename, text: full.parsed_text || "No text extracted." });
    } catch (e) {
      console.error("Failed to load CV text", e);
    } finally {
      setLoadingCVId(null);
    }
  };

  const handleInboxAction = useCallback(async (itemId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      await campaignService.updateInboxStatus(itemId, action);
      setInboxItems(prev => prev.filter(i => i.id !== itemId));
    } catch (e) {
      console.error("Action failed", e);
    }
  }, []);

  // Stable reference map: campaign_id → job_preferences (avoids inline campaigns.find on every render)
  const campaignPrefsMap = useMemo(() => {
    const m = new Map<string, any>();
    campaigns.forEach(c => m.set(c.id, c.job_preferences));
    return m;
  }, [campaigns]);

  // Stable onView callback so MemoJobCard props don't change on every render
  const handleOpenUrl = useCallback((url: string) => window.open(url, "_blank"), []);

  const handleConfirmApplied = useCallback(async (appId: string) => {
    try {
      const updated = await campaignService.confirmApplication(appId);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, ...updated } : a));
      setViewingApplication((prev: any) => prev?.id === appId ? { ...prev, ...updated } : prev);
    } catch (e) {
      console.error("Failed to confirm application", e);
    }
  }, []);

  const handleGenerateQuestions = useCallback(async (appId: string) => {
    setGeneratingQuestionsFor(appId);
    try {
      const questions = await campaignService.generateInterviewQuestions(appId);
      setApplications(prev => prev.map(a => {
        if (a.id !== appId) return a;
        const metadata = { ...(a.cover_letter_metadata || {}), interview_questions: questions };
        return { ...a, cover_letter_metadata: metadata };
      }));
      setViewingApplication((prev: any) => {
        if (!prev || prev.id !== appId) return prev;
        const metadata = { ...(prev.cover_letter_metadata || {}), interview_questions: questions };
        return { ...prev, cover_letter_metadata: metadata };
      });
    } catch (e) {
      console.error("Failed to generate questions", e);
    } finally {
      setGeneratingQuestionsFor(null);
    }
  }, []);

  const handleApplyConfirm = useCallback(async () => {
    if (!applyJob) return;
    setInboxItems(prev => prev.filter(i => i.id !== applyJob.id));
    // Refresh applications list
    try {
      const apps = await campaignService.getApplications();
      setApplications(apps);
    } catch (e) {
      console.error("Failed to refresh applications", e);
    }
    setApplyJob(null);
  }, [applyJob]);

  const handleGenerateCoverLetter = useCallback(async (appId: string) => {
    setGeneratingCoverLetterFor(appId);
    try {
      // Find the inbox_item_id from the application's snapshot or direct field
      const app = applications.find(a => a.id === appId) || viewingApplication;
      const inboxItemId = app?.inbox_item_id;
      if (!inboxItemId) throw new Error("No inbox item linked to this application");
      const text = await campaignService.regenerateCoverLetter(appId, inboxItemId);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, cover_letter_text: text } : a));
      setViewingApplication((prev: any) => prev?.id === appId ? { ...prev, cover_letter_text: text } : prev);
    } catch (e) {
      console.error("Failed to generate cover letter", e);
    } finally {
      setGeneratingCoverLetterFor(null);
    }
  }, [applications, viewingApplication]);

  const handleDeleteApplication = useCallback(async (appId: string) => {
    await campaignService.deleteApplication(appId);
    setApplications(prev => prev.filter(a => a.id !== appId));
    setViewingApplication(null);
  }, []);

  const activeCampaigns = useMemo(() => campaigns.filter(c => c.status === "RUNNING" || c.status === "DRAFT").length, [campaigns]);
  // Memoized so useMemo deps below only invalidate when inboxItems actually changes
  const pendingInbox = useMemo(() => inboxItems.filter(i => i.status === "PENDING_REVIEW"), [inboxItems]);

  // Pre-compute filtered items for campaign detail (hooks must be called unconditionally)
  const allCampaignItems = selectedCampaign
    ? inboxItems.filter(i => i.campaign_id === selectedCampaign.id)
    : [];
  const campaignItems = useMemo(() => {
    let items = applyDateFilter(allCampaignItems, campaignDateFilter);
    if (campaignPlatformFilter.size > 0)
      items = items.filter(i => campaignPlatformFilter.has(i.source || "unknown"));
    if (campaignJobTypeFilter)
      items = items.filter(i => (i.job_description || "").toLowerCase().includes(campaignJobTypeFilter) ||
        (i.job_title || "").toLowerCase().includes(campaignJobTypeFilter));
    if (campaignArrangementFilter)
      items = items.filter(i => (i.remote_type || "").toLowerCase() === campaignArrangementFilter ||
        (i.job_description || "").toLowerCase().includes(campaignArrangementFilter));
    return items;
  }, [allCampaignItems, campaignDateFilter, campaignPlatformFilter, campaignJobTypeFilter, campaignArrangementFilter]);

  // Pre-compute filtered search results
  const filteredPendingInbox = useMemo(() => {
    let items = applyDateFilter(pendingInbox, dateFilter);
    if (platformFilter.size > 0)
      items = items.filter(i => platformFilter.has(i.source || "unknown"));
    if (jobTypeFilter)
      items = items.filter(i => (i.job_description || "").toLowerCase().includes(jobTypeFilter) ||
        (i.job_title || "").toLowerCase().includes(jobTypeFilter));
    if (arrangementFilter)
      items = items.filter(i => (i.remote_type || "").toLowerCase() === arrangementFilter ||
        (i.job_description || "").toLowerCase().includes(arrangementFilter));
    return items;
  }, [pendingInbox, dateFilter, platformFilter, jobTypeFilter, arrangementFilter]);

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

          {/* Campaign Stats — computed from real inbox data */}
          {(() => {
            const total = allCampaignItems.length;
            const avgScore = total > 0
              ? Math.round((allCampaignItems.reduce((s, i) => s + (i.match_score ?? 0), 0) / total) * 100)
              : 0;
            const high   = allCampaignItems.filter(i => (i.match_score ?? 0) >= 0.7).length;
            const medium = allCampaignItems.filter(i => (i.match_score ?? 0) >= 0.5 && (i.match_score ?? 0) < 0.7).length;
            const low    = total - high - medium;

            const sourceMap = new Map<string, number>();
            allCampaignItems.forEach(i => {
              const s = i.source || "unknown";
              sourceMap.set(s, (sourceMap.get(s) || 0) + 1);
            });
            const topSources = Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

            const aiData = selectedCampaign.ai_analysis as any;

            return (
              <GlassCard className="!p-6 mb-8 border-[#00FFFF]/20">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-1.5 rounded-lg bg-[#00FFFF]/10">
                    <Sparkles className="w-5 h-5 text-[#00FFFF]" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Campaign Performance</h2>
                </div>

                {total === 0 ? (
                  <p className="text-[#BBC9CD] text-sm">No results yet - scrapers are running in the background.</p>
                ) : (
                  <div className="space-y-4">
                    {/* Summary row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Total Matched",  value: total,       color: "text-[#00FFFF]",   icon: <Briefcase className="w-4 h-4" /> },
                        { label: "Avg Match Score", value: `${avgScore}%`, color: avgScore >= 70 ? "text-green-400" : avgScore >= 50 ? "text-yellow-400" : "text-red-400", icon: <Sparkles className="w-4 h-4" /> },
                        { label: "High Matches",   value: high,        color: "text-green-400",   icon: <TrendingUp className="w-4 h-4" /> },
                        { label: "Sources Active", value: sourceMap.size, color: "text-purple-400", icon: <Target className="w-4 h-4" /> },
                      ].map(({ label, value, color, icon }) => (
                        <div key={label} className="bg-[#0A0A0A]/60 rounded-lg p-3 border border-[#00FFFF]/10">
                          <div className={`flex items-center gap-1.5 mb-1 ${color}`}>{icon}<span className="text-xs font-semibold">{label}</span></div>
                          <div className={`text-xl font-bold ${color}`}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Score distribution — stacked percentage bar */}
                    <div className="bg-[#0A0A0A]/50 rounded-lg p-4 border border-[#00FFFF]/10">
                      <div className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest mb-3">Match Score Distribution</div>
                      {/* Stacked bar */}
                      <div className="flex rounded-full overflow-hidden h-2.5 mb-3 gap-0.5">
                        {[
                          { count: high,   bg: "#22c55e" },
                          { count: medium, bg: "#eab308" },
                          { count: low,    bg: "#ef4444" },
                        ].filter(s => s.count > 0).map((s, i) => (
                          <div
                            key={i}
                            className="h-full transition-all rounded-full"
                            style={{ width: `${Math.round((s.count / total) * 100)}%`, backgroundColor: s.bg, opacity: 0.75 }}
                          />
                        ))}
                      </div>
                      {/* Legend */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "High ≥70%",  count: high,   dot: "#22c55e" },
                          { label: "Mid 50-70%", count: medium, dot: "#eab308" },
                          { label: "Low <50%",   count: low,    dot: "#ef4444" },
                        ].map(({ label, count: c, dot }) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot, opacity: 0.8 }} />
                            <div>
                              <div className="text-[11px] text-[#BBC9CD]">{label}</div>
                              <div className="text-sm font-bold text-white">{c}
                                <span className="text-[10px] text-[#BBC9CD]/60 ml-1">
                                  ({total > 0 ? Math.round((c / total) * 100) : 0}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top sources */}
                    {topSources.length > 0 && (
                      <div className="bg-[#0A0A0A]/50 rounded-lg p-4 border border-[#00FFFF]/10">
                        <div className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest mb-3">Top Sources</div>
                        <div className="space-y-2">
                          {topSources.map(([source, count]) => {
                            const meta = getSourceMeta(source);
                            return (
                              <div key={source} className="flex items-center gap-3">
                                <span className="text-xs font-semibold w-24 flex-shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                                <div className="flex-1 bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${Math.round((count / total) * 100)}%`, backgroundColor: meta.color, opacity: 0.7 }}
                                  />
                                </div>
                                <span className="text-xs text-[#BBC9CD] w-8 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* AI narrative — only if backend has actually populated it */}
                    {aiData?.overall_performance && (
                      <div className="bg-[#0A0A0A]/50 rounded-lg p-4 border border-[#00FFFF]/10">
                        <div className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest mb-2">AI Analysis</div>
                        <p className="text-[#BBC9CD] text-sm leading-relaxed">{aiData.overall_performance}</p>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })()}

          {/* Matched Jobs — platform + date filters */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
              <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                Matched Opportunities ({campaignItems.length}{campaignPlatformFilter.size > 0 || campaignDateFilter ? ` filtered` : ""})
              </span>
            </div>

            <FilterRow
              dateSelected={campaignDateFilter} onDateChange={setCampaignDateFilter}
              typeSelected={campaignJobTypeFilter} onTypeChange={setCampaignJobTypeFilter}
              arrangementSelected={campaignArrangementFilter} onArrangementChange={setCampaignArrangementFilter}
            />
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
              {campaignItems.map((job) => (
                <MemoJobCard
                  key={job.id}
                  job={job}
                  prefs={prefs}
                  onApply={setApplyJob}
                  onView={handleOpenUrl}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <>
    {/* Campaign delete confirmation modal */}
    {deletingCampaignId && (() => {
      const camp = campaigns.find(c => c.id === deletingCampaignId);
      const jobCount = inboxItems.filter(i => i.campaign_id === deletingCampaignId).length;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0D0D0D] border border-red-500/40 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.15)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Delete Campaign</h2>
                <p className="text-xs text-red-400">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-5">
              <p className="text-sm text-[#BBC9CD] mb-2">
                You are about to permanently delete <span className="font-bold text-white">"{camp?.name}"</span>.
              </p>
              <p className="text-sm text-red-300 font-semibold">
                This will also delete {jobCount} matched job{jobCount !== 1 ? "s" : ""} from your inbox.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingCampaignId(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#222] text-[#BBC9CD] font-semibold border border-[#00FFFF]/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCampaign(deletingCampaignId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold border border-red-500/40 transition-colors"
              >
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* CV viewer modal */}
    {viewingCV && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className="w-full max-w-2xl bg-[#0D0D0D] border border-[#00FFFF]/30 rounded-2xl shadow-[0_0_60px_rgba(0,255,255,0.12)] flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 p-5 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-[#00FFFF]/10 flex-shrink-0">
                <FileText className="w-5 h-5 text-[#00FFFF]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#DAE2FD] truncate">{viewingCV.filename}</h2>
                <p className="text-xs text-[#BBC9CD]/60">Extracted text - {viewingCV.text.length.toLocaleString()} characters</p>
              </div>
            </div>
            <button
              onClick={() => setViewingCV(null)}
              className="p-2 rounded-lg hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            <pre className="text-sm text-[#BBC9CD] leading-relaxed whitespace-pre-wrap font-mono bg-[#0A0A0A]/60 rounded-xl p-4 border border-[#00FFFF]/10">
              {viewingCV.text}
            </pre>
          </div>
        </div>
      </div>
    )}

    {applyJob && (
      <ApplyModal
        job={applyJob}
        onConfirm={handleApplyConfirm}
        onClose={() => setApplyJob(null)}
      />
    )}

    {viewingApplication && (
      <ApplicationDetailModal
        application={viewingApplication}
        onClose={() => setViewingApplication(null)}
        onConfirmApplied={handleConfirmApplied}
        onGenerateQuestions={handleGenerateQuestions}
        isGeneratingQuestions={generatingQuestionsFor === viewingApplication.id}
        onDelete={handleDeleteApplication}
        onGenerateCoverLetter={handleGenerateCoverLetter}
        isGeneratingCoverLetter={generatingCoverLetterFor === viewingApplication.id}
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

        {/* Stats strip — compact inline pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { icon: <Search className="w-3.5 h-3.5" />, value: activeCampaigns,      label: "Active Campaigns", color: "text-[#00FFFF]",   bg: "bg-[#00FFFF]/10"    },
            { icon: <Inbox  className="w-3.5 h-3.5" />, value: pendingInbox.length,   label: "Pending Review",   color: "text-green-400",   bg: "bg-green-500/10"    },
            { icon: <Send   className="w-3.5 h-3.5" />, value: applicationsCount,        label: "Applications",     color: "text-yellow-400",  bg: "bg-yellow-500/10"   },
            { icon: <Sparkles className="w-3.5 h-3.5" />, value: pendingInbox.length > 0 ? `${Math.round((pendingInbox.reduce((s,i) => s + (i.match_score ?? 0), 0) / pendingInbox.length) * 100)}%` : "-", label: "Avg Match",  color: "text-purple-400",  bg: "bg-purple-500/10"   },
          ].map(({ icon, value, label, color, bg }) => (
            <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-[#00FFFF]/10 bg-[#0D0D0D]/60`}>
              <span className={`${color} ${bg} p-1 rounded-md`}>{icon}</span>
              <span className={`text-base font-bold ${color}`}>{value}</span>
              <span className="text-xs text-[#BBC9CD]">{label}</span>
            </div>
          ))}
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
              onClick={async () => {
                setShowNewCampaign(true);
                try {
                  const cv = await campaignService.getPrimaryCV();
                  if (cv?.parsed_text) setCvKeywordSuggestions(extractCVKeywords(cv.parsed_text));
                } catch { /* no CV yet - no suggestions */ }
              }}
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
                    placeholder="e.g., Python Engineer, Fullstack, React"
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder-[#BBC9CD]/50 focus:border-[#00FFFF]/40 focus:outline-none transition-colors"
                  />
                  {cvKeywordSuggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold text-[#BBC9CD]/50 uppercase tracking-widest mb-1.5">From your CV</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cvKeywordSuggestions.map(kw => {
                          const active = newCampaign.keywords.toLowerCase().includes(kw.toLowerCase());
                          return (
                            <button
                              key={kw}
                              type="button"
                              onClick={() => {
                                if (active) return;
                                const current = newCampaign.keywords.trim();
                                setNewCampaign({ ...newCampaign, keywords: current ? `${current}, ${kw}` : kw });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                active
                                  ? 'bg-[#00FFFF]/20 border-[#00FFFF]/50 text-[#00FFFF] cursor-default'
                                  : 'bg-[#00FFFF]/5 border-[#00FFFF]/20 text-[#00FFFF]/70 hover:bg-[#00FFFF]/15 hover:border-[#00FFFF]/40 hover:text-[#00FFFF] cursor-pointer'
                              }`}
                            >
                              {active ? '✓ ' : '+ '}{kw}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
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

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Job Type */}
                  <div>
                    <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Job Type</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Any",        value: "" },
                        { label: "Full-time",  value: "full-time" },
                        { label: "Part-time",  value: "part-time" },
                        { label: "Contract",   value: "contract" },
                        { label: "Freelance",  value: "freelance" },
                      ].map(({ label, value }) => (
                        <button key={value} type="button"
                          onClick={() => setNewCampaign({ ...newCampaign, job_type: value })}
                          className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                            newCampaign.job_type === value
                              ? "bg-[#00FFFF]/20 border-[#00FFFF]/50 text-[#00FFFF]"
                              : "bg-[#0A0A0A]/50 border-[#00FFFF]/15 text-[#BBC9CD] hover:border-[#00FFFF]/35"
                          }`}
                        >{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Work Arrangement */}
                  <div>
                    <label className="block text-sm font-semibold text-[#BBC9CD] mb-2">Work Arrangement</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Any",     value: "" },
                        { label: "Remote",  value: "remote" },
                        { label: "Hybrid",  value: "hybrid" },
                        { label: "On-site", value: "onsite" },
                      ].map(({ label, value }) => (
                        <button key={value} type="button"
                          onClick={() => setNewCampaign({ ...newCampaign, work_arrangement: value })}
                          className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                            newCampaign.work_arrangement === value
                              ? "bg-[#00FFFF]/20 border-[#00FFFF]/50 text-[#00FFFF]"
                              : "bg-[#0A0A0A]/50 border-[#00FFFF]/15 text-[#BBC9CD] hover:border-[#00FFFF]/35"
                          }`}
                        >{label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CV Upload — required only when no CV exists yet */}
                {(() => {
                  const hasExistingCV = cvs.length > 0;
                  const primaryCV = cvs.find(c => c.is_primary) ?? cvs[0];
                  const canSubmit = !!(newCampaign.name && newCampaign.keywords && (uploadedCV || hasExistingCV));
                  return (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-sm font-semibold text-[#BBC9CD]">Upload CV/Resume</label>
                          {!hasExistingCV && !uploadedCV && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-400 uppercase tracking-wide">Required</span>
                          )}
                          {hasExistingCV && !uploadedCV && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#00FFFF]/10 border border-[#00FFFF]/25 text-[#00FFFF] uppercase tracking-wide">Optional</span>
                          )}
                          <span className="text-xs text-[#BBC9CD]/50">used to personalise cover letters</span>
                        </div>

                        {/* Show active CV notice when one already exists */}
                        {hasExistingCV && !uploadedCV && (
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#00FFFF]/5 border border-[#00FFFF]/20 mb-2">
                            <FileText className="w-4 h-4 text-[#00FFFF] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-[#BBC9CD]">Using active CV: </span>
                              <span className="text-xs font-semibold text-[#DAE2FD] truncate">{primaryCV?.filename}</span>
                            </div>
                            <span className="text-[10px] text-[#00FFFF]/60">or upload a new one below</span>
                          </div>
                        )}

                        {!uploadedCV ? (
                          <label
                            htmlFor="cv-upload"
                            className={`flex flex-col items-center justify-center p-5 rounded-xl bg-[#0A0A0A]/50 border-2 border-dashed transition-all cursor-pointer group ${
                              !hasExistingCV ? "border-red-500/30 hover:border-[#00FFFF]/40" : "border-[#00FFFF]/15 hover:border-[#00FFFF]/35"
                            }`}
                          >
                            <input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="hidden" id="cv-upload" />
                            <Upload className={`w-7 h-7 mb-2 group-hover:text-[#00FFFF] group-hover:scale-110 transition-all ${!hasExistingCV ? "text-red-400/70" : "text-[#BBC9CD]/40"}`} />
                            <span className="text-sm text-[#BBC9CD]">{hasExistingCV ? "Upload a different CV" : "Click to upload your CV"}</span>
                            <span className="text-xs text-[#BBC9CD]/50 mt-0.5">PDF, DOC, or DOCX (Max 10MB)</span>
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/5 border border-green-500/30">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-green-500/10">
                                <FileText className="w-5 h-5 text-green-400" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-[#DAE2FD]">{uploadedCV.name}</div>
                                <div className="text-xs text-green-400/70">{(uploadedCV.size / 1024).toFixed(1)} KB · Ready</div>
                              </div>
                            </div>
                            <button onClick={handleRemoveCV} className="p-2 rounded-lg hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-red-400 transition-colors">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleCreateCampaign}
                        disabled={!canSubmit}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 hover:from-[#00FFFF]/30 hover:to-[#0099CC]/30 text-[#00FFFF] font-semibold transition-all border border-[#00FFFF]/40 hover:border-[#00FFFF]/60 shadow-[0_0_20px_rgba(0,255,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        <Sparkles className="w-5 h-5" />
                        {!canSubmit && !hasExistingCV ? "Upload CV to Continue" : "Start AI Agent"}
                      </button>
                    </>
                  );
                })()}

              </div>
            </GlassCard>
          )}

          {/* Campaign Grid — compact cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {campaigns.length === 0 && (
              <div className="col-span-full text-center py-6 text-[#BBC9CD]">No active campaigns.</div>
            )}
            {campaigns.map((campaign) => {
              const prefs = campaign.job_preferences as Record<string, any>;
              const jobCount = inboxItems.filter(i => i.campaign_id === campaign.id).length;
              const isActive = campaign.status === "RUNNING" || campaign.status === "DRAFT";
              return (
                <GlassCard
                  key={campaign.id}
                  className="!p-4 hover:border-[#00FFFF]/40 transition-all cursor-pointer flex flex-col gap-2"
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  {/* Name + status */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <h3 className="font-bold text-[#DAE2FD] text-sm truncate">{campaign.name}</h3>
                    {isActive && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/20 border border-green-500/30 flex-shrink-0">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[10px] text-green-400 font-semibold">{campaign.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Key details */}
                  <div className="flex flex-col gap-1 text-xs text-[#BBC9CD]">
                    {prefs?.keywords && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Search className="w-3 h-3 text-[#00FFFF] flex-shrink-0" />
                        <span className="truncate">{prefs.keywords}</span>
                      </div>
                    )}
                    {prefs?.location && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-[#00FFFF] flex-shrink-0" />
                        <span className="truncate">{prefs.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer: result count + open + delete */}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#00FFFF]/10">
                    <span className="text-xs text-[#BBC9CD]">
                      <span className="font-semibold text-[#00FFFF]">{jobCount}</span> results
                    </span>
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-[#00FFFF]/60" />
                      <button
                        onClick={e => { e.stopPropagation(); setDeletingCampaignId(campaign.id); }}
                        className="p-1 rounded hover:bg-red-500/20 text-[#BBC9CD]/40 hover:text-red-400 transition-colors"
                        title="Delete campaign"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* CV Management Panel */}
        {cvs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
              <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">Your CVs</span>
            </div>
            <div className="flex flex-col gap-2">
              {cvs.map(cv => (
                <GlassCard
                  key={cv.id}
                  className="!p-3 flex items-center gap-3 cursor-pointer hover:border-[#00FFFF]/40 transition-all"
                  onClick={() => handleViewCV(cv)}
                >
                  {/* Active radio */}
                  <button
                    onClick={e => { e.stopPropagation(); if (!cv.is_primary) handleSetPrimaryCV(cv.id); }}
                    title={cv.is_primary ? "Active CV" : "Set as active"}
                    className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: cv.is_primary ? "#00FFFF" : "rgba(187,201,205,0.3)",
                      backgroundColor: cv.is_primary ? "rgba(0,255,255,0.1)" : "transparent",
                    }}
                  >
                    {cv.is_primary && <span className="w-2 h-2 rounded-full bg-[#00FFFF]" />}
                  </button>

                  <div className={`p-2 rounded-lg flex-shrink-0 ${cv.is_primary ? "bg-[#00FFFF]/10" : "bg-[#1A1A1A]"}`}>
                    {loadingCVId === cv.id
                      ? <Loader2 className="w-4 h-4 text-[#00FFFF] animate-spin" />
                      : <FileText className={`w-4 h-4 ${cv.is_primary ? "text-[#00FFFF]" : "text-[#BBC9CD]"}`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#DAE2FD] truncate">{cv.filename}</span>
                      {cv.is_primary && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#00FFFF]/15 border border-[#00FFFF]/30 text-[#00FFFF] flex-shrink-0">ACTIVE</span>
                      )}
                    </div>
                    <div className="text-xs text-[#BBC9CD]/60">
                      {cv.file_size_bytes ? `${(cv.file_size_bytes / 1024).toFixed(1)} KB · ` : ""}
                      {cv.uploaded_at ? relativeDate(cv.uploaded_at) : ""}
                      <span className="ml-2 text-[#00FFFF]/40">Click to view</span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteCV(cv.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-[#BBC9CD]/40 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Delete CV"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Applied Jobs Section */}
        {applications.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
              <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                Your Applications ({applications.length})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {applications.map(app => {
                const snapshot = app.cover_letter_metadata?.job_snapshot || {};
                const jobTitle = snapshot.job_title || app.inbox_items?.job_title || "Unknown Role";
                const company = snapshot.company_name || app.inbox_items?.company_name || "Unknown Company";
                const location = snapshot.location || app.inbox_items?.location;
                const source = snapshot.source || app.inbox_items?.source;
                const srcMeta = getSourceMeta(source);
                const statusMeta = getStatusMeta(app.status);
                const hasQuestions = (app.cover_letter_metadata?.interview_questions || []).length > 0;
                return (
                  <GlassCard
                    key={app.id}
                    className="!p-4 hover:border-[#00FFFF]/40 transition-all cursor-pointer flex flex-col gap-2"
                    onClick={() => setViewingApplication(app)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold px-2 py-1 rounded-md"
                        style={{ color: srcMeta.color, backgroundColor: srcMeta.bg, border: `1px solid ${srcMeta.border}` }}>
                        {srcMeta.label}
                      </span>
                      <span className="text-xs font-bold px-2 py-1 rounded-md"
                        style={{ color: statusMeta.color, backgroundColor: statusMeta.bg, border: `1px solid ${statusMeta.border}` }}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00FFFF]/20 to-[#0099CC]/20 border border-[#00FFFF]/30 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-[#00FFFF]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[#DAE2FD] text-sm leading-tight truncate">{jobTitle}</h3>
                        <p className="text-xs text-[#BBC9CD] truncate">{company}</p>
                        {location && <p className="text-xs text-[#BBC9CD]/60 truncate flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 text-[#00FFFF]" />{location}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#00FFFF]/10">
                      {app.applied_at
                        ? <span className="text-xs text-[#BBC9CD]/60 flex items-center gap-1"><Clock className="w-3 h-3" />Applied {relativeDate(app.applied_at)}</span>
                        : <span className="text-xs text-[#BBC9CD]/60">Not submitted yet</span>
                      }
                      <div className="flex items-center gap-2">
                        {hasQuestions && (
                          <span className="text-xs text-[#00FFFF]/60 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />Prep ready
                          </span>
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (window.confirm(`Delete application for "${jobTitle}" at ${company}? This cannot be undone.`)) {
                              handleDeleteApplication(app.id);
                            }
                          }}
                          title="Delete application"
                          className="p-1 rounded-md hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Job Results Inbox (HITL) — platform + date filters */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
            <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
              Search Results ({filteredPendingInbox.length}{platformFilter.size > 0 || dateFilter ? " filtered" : ""})
            </span>
          </div>

          <FilterRow
            dateSelected={dateFilter} onDateChange={setDateFilter}
            typeSelected={jobTypeFilter} onTypeChange={setJobTypeFilter}
            arrangementSelected={arrangementFilter} onArrangementChange={setArrangementFilter}
          />
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
            {filteredPendingInbox.map((job) => (
              <MemoJobCard
                key={job.id}
                job={job}
                prefs={campaignPrefsMap.get(job.campaign_id ?? "") as any}
                onApply={setApplyJob}
                onAction={handleInboxAction}
                onView={handleOpenUrl}
                showReject
              />
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
