import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router";
import {
  Menu, Mail, Send, Edit, ArrowLeft, CornerUpLeft, CornerUpRight,
  Shield, X, Plus, Search, Paperclip, Loader2, Sparkles, AlertCircle
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";
import { emailService } from "../../services/emailService";
import { fetchVllmStatus, triggerVllmWarmup, VllmStatus } from "../../services/vllmService";
import { Email } from "../../types/email";

// ─── Internal types ────────────────────────────────────────────────────────────

interface ComposeState {
  to: string;
  subject: string;
  body: string;
}

interface WhitelistEntry {
  id: string;
  email_address: string;
  contact_name: string;
}

interface ContactSuggestion {
  name: string;
  email: string;
}

interface EmailBodyCache {
  body: string;
  html: string | null;
  attachments: Array<{ filename: string; mimeType: string; data: string }>;
}

const EMPTY_COMPOSE: ComposeState = { to: '', subject: '', body: '' };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(from: string): string {
  const name = from.replace(/<.*>/, '').trim().replace(/^["']|["']$/g, '');
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '??';
}

function avatarColor(from: string): string {
  const colors = [
    'bg-[#00FFFF]/20 text-[#00FFFF]',
    'bg-purple-500/20 text-purple-300',
    'bg-emerald-500/20 text-emerald-300',
    'bg-amber-500/20 text-amber-300',
    'bg-rose-500/20 text-rose-300',
    'bg-sky-500/20 text-sky-300',
  ];
  let hash = 0;
  for (let i = 0; i < from.length; i++) hash = (hash * 31 + from.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function formatRelativeDate(ts: string | undefined): string {
  if (!ts) return '';
  const d = new Date(isNaN(Number(ts)) ? ts : Number(ts));
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatFullDate(ts: string | undefined): string {
  if (!ts) return '';
  const d = new Date(isNaN(Number(ts)) ? ts : Number(ts));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function parseSenderName(from: string): string {
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  return from.replace(/^["']|["']$/g, '');
}

function parseSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  return from;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function EmailView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);

  // Email list + selection
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  // On mobile: show content pane when an email is selected
  const [mobileShowContent, setMobileShowContent] = useState(false);

  // Per-email body cache (fetched lazily)
  const [bodyCache, setBodyCache] = useState<Record<string, EmailBodyCache>>({});
  const [bodyLoading, setBodyLoading] = useState(false);

  // Compose modal
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState<ComposeState>(EMPTY_COMPOSE);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Qwen compose assist
  const [showQwenAssist, setShowQwenAssist] = useState(false);
  const [qwenPrompt, setQwenPrompt] = useState('');
  const [qwenTone, setQwenTone] = useState<'professional' | 'casual' | 'formal'>('professional');
  const [qwenLoading, setQwenLoading] = useState(false);
  const [qwenError, setQwenError] = useState<string | null>(null);
  const [vllmStatus, setVllmStatus] = useState<VllmStatus>('offline');
  const [warmingUp, setWarmingUp] = useState(false);

  // Whitelist drawer
  const [showWhitelist, setShowWhitelist] = useState(false);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addingEntry, setAddingEntry] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compose contact autocomplete
  const [composeSuggestions, setComposeSuggestions] = useState<ContactSuggestion[]>([]);
  const [showComposeSuggestions, setShowComposeSuggestions] = useState(false);
  const composeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composeDropdownRef = useRef<HTMLDivElement>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchEmails = async () => {
    try {
      const data = await emailService.fetchInbox();
      setEmails(data);
    } catch (error) {
      console.error('[EmailView] Fetch inbox failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmails(); }, []);

  // Lazy-load full body when an email is selected
  useEffect(() => {
    if (!selectedEmail) return;
    if (bodyCache[selectedEmail.id]) return;
    let cancelled = false;
    (async () => {
      setBodyLoading(true);
      const result = await emailService.fetchEmailBody(selectedEmail.id);
      if (!cancelled) {
        setBodyCache(prev => ({ ...prev, [selectedEmail.id]: result }));
        setBodyLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedEmail?.id]);

  // Whitelist load on drawer open
  useEffect(() => {
    if (!showWhitelist) return;
    (async () => {
      setWhitelistLoading(true);
      try {
        const entries = await emailService.getWhitelist();
        setWhitelist(entries);
      } catch (err) {
        console.error('[Whitelist] Load failed:', err);
      } finally {
        setWhitelistLoading(false);
      }
    })();
  }, [showWhitelist]);

  // Debounced contact search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await emailService.searchContacts(searchQuery);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // Dismiss contact dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced compose "To" contact search
  useEffect(() => {
    if (composeDebounceRef.current) clearTimeout(composeDebounceRef.current);
    const q = compose.to;
    if (q.length < 2) { setComposeSuggestions([]); setShowComposeSuggestions(false); return; }
    composeDebounceRef.current = setTimeout(async () => {
      try {
        const results = await emailService.searchContacts(q);
        setComposeSuggestions(results);
        setShowComposeSuggestions(results.length > 0);
      } catch {
        setComposeSuggestions([]); setShowComposeSuggestions(false);
      }
    }, 300);
    return () => { if (composeDebounceRef.current) clearTimeout(composeDebounceRef.current); };
  }, [compose.to]);

  // Dismiss compose contact dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (composeDropdownRef.current && !composeDropdownRef.current.contains(e.target as Node)) {
        setShowComposeSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
    }
    if (isMobile) setMobileShowContent(true);
  };

  const handleSuggestionSelect = (contact: ContactSuggestion) => {
    setAddEmail(contact.email);
    setAddName(contact.name);
    setSearchQuery(`${contact.name} <${contact.email}>`);
    setShowDropdown(false);
  };

  const handleAddToWhitelist = async () => {
    if (!addEmail.trim()) return;
    setAddingEntry(true);
    setAddError(null);
    try {
      await emailService.addToWhitelist(addEmail.trim(), addName.trim());
      const entries = await emailService.getWhitelist();
      setWhitelist(entries);
      await fetchEmails();
      setAddEmail(''); setAddName(''); setSearchQuery(''); setSuggestions([]);
    } catch {
      setAddError('Failed to add entry. Please try again.');
    } finally {
      setAddingEntry(false);
    }
  };

  const handleRemoveFromWhitelist = async (id: string) => {
    try {
      await emailService.removeFromWhitelist(id);
      setWhitelist(prev => prev.filter(e => e.id !== id));
    } catch {
      console.error('[Whitelist] Remove failed');
    }
  };

  const openCompose = (prefill: Partial<ComposeState> = {}) => {
    setCompose({ ...EMPTY_COMPOSE, ...prefill });
    setSendError(null);
    setShowQwenAssist(false);
    setQwenPrompt('');
    setShowCompose(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compose.to.trim() || !compose.subject.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await emailService.sendEmail({ to: compose.to, subject: compose.subject, body: compose.body });
      setShowCompose(false);
    } catch {
      setSendError('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Check vLLM status when compose opens
  useEffect(() => {
    if (!showCompose) return;
    fetchVllmStatus().then(({ status }) => setVllmStatus(status)).catch(() => setVllmStatus('offline'));
  }, [showCompose]);

  const handleQwenWrite = async () => {
    if (!qwenPrompt.trim() && !compose.body.trim()) return;
    setQwenLoading(true);
    setQwenError(null);
    try {
      const draft = qwenPrompt.trim() || compose.body;
      const rewritten = await emailService.rewriteEmail(draft, qwenTone);
      setCompose(c => ({ ...c, body: rewritten }));
      setShowQwenAssist(false);
      setQwenPrompt('');
    } catch (err: any) {
      setQwenError(err?.message?.includes('cold') || err?.message?.includes('timeout')
        ? 'Qwen is warming up - try again in 30 seconds.'
        : (err?.message || 'Qwen failed to generate. The model may be offline.'));
    } finally {
      setQwenLoading(false);
    }
  };

  const handleWarmupVllm = async () => {
    setWarmingUp(true);
    setQwenError(null);
    try {
      await triggerVllmWarmup();
      // Poll status for up to 60s
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const { status } = await fetchVllmStatus();
        setVllmStatus(status);
        if (status === 'online') break;
      }
    } catch {
      setQwenError('Failed to wake up model. Please try again.');
    } finally {
      setWarmingUp(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const whitelistCount = emails.filter(e => e.status === 'whitelisted').length;

  const getEmailBody = (email: Email): { text: string; html: string | null } => {
    const cached = bodyCache[email.id];
    if (cached && (cached.body || cached.html)) {
      return { text: cached.body, html: cached.html };
    }
    // Fallback to snippet or body field from list response
    return { text: email.snippet || email.body || '', html: null };
  };

  const getAttachments = (email: Email) => bodyCache[email.id]?.attachments ?? [];

  // ── Panel visibility for mobile ──────────────────────────────────────────────

  const showListPanel = !isMobile || !mobileShowContent;
  const showContentPanel = !isMobile || mobileShowContent;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={`${isMobile ? 'pt-16' : 'pl-64'} flex flex-col`} style={{ height: '100vh', overflow: 'hidden' }}>
      {!isMobile && <Sidebar />}
      <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Fixed header */}
      <header className={`flex-shrink-0 ${isMobile ? 'px-4 pt-2 pb-3' : 'px-8 pt-6 pb-4'} border-b border-[#00FFFF]/10`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full" />
              <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                Personal Communication
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#DAE2FD] tracking-tight">Vibe Inbox</h1>
            <p className="text-xs text-[#BBC9CD] mt-0.5">Whitelist active -- {whitelistCount} approved senders</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWhitelist(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-semibold text-sm transition-all ${
                showWhitelist
                  ? 'bg-[#00FFFF]/10 border-[#00FFFF]/50 text-[#00FFFF]'
                  : 'border-[#00FFFF]/20 text-[#BBC9CD] hover:text-[#00FFFF] hover:bg-[#00FFFF]/5'
              }`}
            >
              <Shield className="w-4 h-4" />
              {!isMobile && <span>Manage Whitelist</span>}
            </button>
            <button
              onClick={() => openCompose()}
              className="flex items-center gap-2 px-3 py-2 font-semibold rounded-xl bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all text-sm"
            >
              <Edit className="w-4 h-4" />
              {!isMobile && <span>Compose</span>}
            </button>
            {isMobile && (
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors border border-[#00FFFF]/20"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Two-panel body -- fills remaining viewport height */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Email List Panel ─────────────────────────────────────────────── */}
        {showListPanel && (
          <div
            className={`flex flex-col border-r border-[#00FFFF]/10 overflow-y-auto ${
              isMobile ? 'w-full' : 'w-[35%] flex-shrink-0'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center flex-1 text-[#BBC9CD] text-sm">Syncing emails...</div>
            ) : emails.length === 0 ? (
              <div className="flex items-center justify-center flex-1 text-[#BBC9CD] text-sm">Inbox empty</div>
            ) : (
              emails.map(email => {
                const isSelected = selectedEmail?.id === email.id;
                const isUnread = !email.is_read;
                const initials = getInitials(email.from);
                const avatarCls = avatarColor(email.from);
                const relDate = formatRelativeDate(email.timestamp ?? email.date);
                const isJobMatch = email.source === 'job_filter';

                return (
                  <button
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`w-full text-left pl-3 pr-4 py-3 border-b border-[#00FFFF]/5 transition-all flex items-center gap-3 relative ${
                      isSelected
                        ? 'bg-[#00FFFF]/5 border-l-2 border-l-[#00FFFF]/60'
                        : 'hover:bg-[#1A1A1A]/60 border-l-2 border-l-transparent'
                    }`}
                  >
                    {/* Unread dot */}
                    <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${isUnread ? 'bg-[#00FFFF]' : 'bg-transparent'}`} />
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${avatarCls}`}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Row 1: sender + date */}
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-sm truncate ${isUnread ? 'text-[#DAE2FD] font-semibold' : 'text-[#BBC9CD]'}`}>
                          {parseSenderName(email.from)}
                        </span>
                        <span className="text-xs text-[#BBC9CD]/70 flex-shrink-0">{relDate}</span>
                      </div>
                      {/* Row 2: subject */}
                      <p className={`text-xs truncate mb-1 ${isUnread ? 'text-[#DAE2FD]' : 'text-[#BBC9CD]/70'}`}>
                        {email.subject}
                      </p>
                      {/* Row 3: snippet + badge */}
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-[#BBC9CD]/50 truncate flex-1">
                          {email.snippet || email.body || ''}
                        </p>
                        {isJobMatch && (
                          <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Job Match
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* ── Email Content Pane ───────────────────────────────────────────── */}
        {showContentPanel && (
          <div className={`flex flex-col overflow-y-auto ${isMobile ? 'w-full' : 'flex-1'}`}>
            {/* Mobile back button */}
            {isMobile && mobileShowContent && (
              <button
                onClick={() => setMobileShowContent(false)}
                className="flex items-center gap-2 px-4 py-3 text-[#00FFFF] text-sm border-b border-[#00FFFF]/10 hover:bg-[#1A1A1A]/40 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to inbox
              </button>
            )}

            {selectedEmail ? (
              <div className="flex flex-col flex-1 p-6">
                {/* Content header */}
                <div className="pb-5 border-b border-[#00FFFF]/10 mb-5">
                  {/* Avatar + sender info */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor(selectedEmail.from)}`}>
                      {getInitials(selectedEmail.from)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-[#DAE2FD]">
                          {parseSenderName(selectedEmail.from)}
                        </span>
                        <span className="text-xs text-[#BBC9CD]/70">
                          &lt;{parseSenderEmail(selectedEmail.from)}&gt;
                        </span>
                        {selectedEmail.source === 'job_filter' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Job Application Match
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#BBC9CD]/60 mt-0.5">
                        {formatFullDate(selectedEmail.timestamp ?? selectedEmail.date)}
                      </p>
                    </div>
                  </div>

                  {/* Subject */}
                  <h2 className="text-xl font-bold text-[#DAE2FD] mb-4 leading-snug">
                    {selectedEmail.subject}
                  </h2>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#00FFFF]/20 text-[#00FFFF] text-sm hover:bg-[#00FFFF]/10 transition-colors"
                      onClick={() => openCompose({ to: selectedEmail.from, subject: `Re: ${selectedEmail.subject}` })}
                    >
                      <CornerUpLeft className="w-4 h-4" /> Reply
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#00FFFF]/20 text-[#00FFFF] text-sm hover:bg-[#00FFFF]/10 transition-colors"
                      onClick={() => openCompose({ subject: `Fwd: ${selectedEmail.subject}` })}
                    >
                      <CornerUpRight className="w-4 h-4" /> Forward
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1">
                  {bodyLoading ? (
                    <div className="flex items-center gap-2 text-[#BBC9CD]/60 text-sm py-4">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading message...
                    </div>
                  ) : (() => {
                    const { text, html } = getEmailBody(selectedEmail);
                    if (html) {
                      return (
                        <div className="max-w-full overflow-x-auto rounded-xl">
                          <div
                            className="email-html-body bg-white text-[#0A0A0A] rounded-xl p-4 text-sm"
                            style={{ maxWidth: '100%' }}
                            dangerouslySetInnerHTML={{ __html: html }}
                          />
                        </div>
                      );
                    }
                    return (
                      <p className="text-[#DAE2FD] text-sm leading-relaxed whitespace-pre-wrap">
                        {text || <span className="text-[#BBC9CD]/50 italic">No message body available.</span>}
                      </p>
                    );
                  })()}
                </div>

                {/* Attachments */}
                {getAttachments(selectedEmail).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#00FFFF]/10">
                    <p className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest mb-3">Attachments</p>
                    <div className="flex flex-wrap gap-2">
                      {getAttachments(selectedEmail).map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#00FFFF]/20 text-[#DAE2FD] text-xs"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-[#BBC9CD]" />
                          <span className="max-w-[160px] truncate">{att.filename}</span>
                          <span className="text-[#BBC9CD]/50 text-xs">{att.mimeType?.split('/')[1] ?? ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center text-[#BBC9CD]/40">
                <Mail className="w-14 h-14 mb-4 opacity-40" />
                <p className="text-base">Select an email to read</p>
              </div>
            )}
          </div>
        )}

        {/* ── Whitelist Drawer (slide-in over content pane) ───────────────── */}
        <div
          className={`absolute top-0 right-0 h-full w-80 bg-[#0D0D12] border-l border-[#00FFFF]/20 flex flex-col gap-4 p-4 transition-transform duration-300 z-30 ${
            showWhitelist ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00FFFF]" />
              <span className="text-sm font-semibold text-[#DAE2FD]">Whitelist</span>
            </div>
            <button
              onClick={() => setShowWhitelist(false)}
              className="text-[#BBC9CD] hover:text-white transition-colors"
              aria-label="Close whitelist panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contact search */}
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBC9CD]" />
              <input
                type="text"
                placeholder="Search contacts or type email..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setAddEmail(e.target.value); setAddName(''); }}
                onKeyDown={e => e.key === 'Escape' && setShowDropdown(false)}
                className="w-full bg-[#1A1A1A] border border-[#00FFFF]/20 text-[#DAE2FD] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#00FFFF]/50 placeholder:text-[#BBC9CD]/50"
              />
            </div>
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-[#00FFFF]/20 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {suggestions.map((contact, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 hover:bg-[#00FFFF]/10 transition-colors"
                    onMouseDown={e => { e.preventDefault(); handleSuggestionSelect(contact); }}
                  >
                    <span className="text-sm font-semibold text-[#DAE2FD]">{contact.name || contact.email}</span>
                    {contact.name && <span className="text-xs text-[#BBC9CD] ml-2">{contact.email}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add button */}
          <button
            onClick={handleAddToWhitelist}
            disabled={!addEmail.trim() || addingEntry}
            className="flex-shrink-0 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(0,255,255,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" />
            {addingEntry ? 'Adding...' : 'Add to whitelist'}
          </button>

          {addError && <p className="text-red-400 text-xs flex-shrink-0">{addError}</p>}

          {/* Approved senders list */}
          <div className="flex flex-col gap-2 overflow-y-auto flex-1">
            <span className="text-xs text-[#BBC9CD] uppercase tracking-widest font-semibold">Approved senders</span>
            {whitelistLoading ? (
              <div className="text-[#BBC9CD] text-sm text-center py-4">Loading...</div>
            ) : whitelist.length === 0 ? (
              <div className="text-[#BBC9CD]/50 text-sm text-center py-4">No entries yet</div>
            ) : (
              whitelist.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 bg-[#1A1A1A] border border-[#00FFFF]/20 rounded-lg px-3 py-1.5"
                >
                  <div className="flex flex-col min-w-0">
                    {entry.contact_name && (
                      <span className="text-xs font-semibold text-[#DAE2FD] truncate">{entry.contact_name}</span>
                    )}
                    <span className="text-xs text-[#BBC9CD] truncate">{entry.email_address}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveFromWhitelist(entry.id)}
                    className="text-[#BBC9CD] hover:text-red-400 transition-colors flex-shrink-0"
                    aria-label={`Remove ${entry.email_address} from whitelist`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Compose Overlay Window (Gmail-style, fixed bottom-right) ─────────── */}
      {showCompose && (
        <div
          className="fixed bottom-0 right-6 z-[9999] flex flex-col bg-[#0A0A0A] border border-[#00FFFF]/25 rounded-t-2xl shadow-2xl shadow-[#00FFFF]/10"
          style={{ width: 680, maxHeight: '86vh' }}
        >
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A]/80 rounded-t-2xl border-b border-[#00FFFF]/10 flex-shrink-0">
            <span className="text-sm font-semibold text-[#DAE2FD]">New Message</span>
            <button onClick={() => setShowCompose(false)} className="text-[#BBC9CD] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form className="flex flex-col overflow-y-auto flex-1" onSubmit={handleSendEmail}>
            {/* To field with autocomplete */}
            <div className="relative border-b border-[#00FFFF]/10" ref={composeDropdownRef}>
              <div className="flex items-center gap-2 px-4">
                <span className="text-xs text-[#BBC9CD]/60 flex-shrink-0 w-12">To</span>
                <input
                  type="text"
                  placeholder="Recipients"
                  value={compose.to}
                  onChange={e => setCompose(c => ({ ...c, to: e.target.value }))}
                  onFocus={() => compose.to.length >= 2 && setShowComposeSuggestions(composeSuggestions.length > 0)}
                  required
                  className="flex-1 py-2 bg-transparent text-[#DAE2FD] text-sm focus:outline-none placeholder:text-[#BBC9CD]/40"
                />
              </div>
              {showComposeSuggestions && composeSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-[#1A1A1A] border border-[#00FFFF]/20 rounded-b-xl shadow-lg z-50 max-h-40 overflow-y-auto">
                  {composeSuggestions.map((contact, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-[#00FFFF]/10 transition-colors"
                      onMouseDown={e => {
                        e.preventDefault();
                        setCompose(c => ({ ...c, to: contact.email }));
                        setShowComposeSuggestions(false);
                      }}
                    >
                      <span className="text-sm font-semibold text-[#DAE2FD]">{contact.name || contact.email}</span>
                      {contact.name && <span className="text-xs text-[#BBC9CD] ml-2">{contact.email}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subject field */}
            <div className="flex items-center gap-2 px-4 border-b border-[#00FFFF]/10">
              <span className="text-xs text-[#BBC9CD]/60 flex-shrink-0 w-12">Subject</span>
              <input
                type="text"
                placeholder="Subject"
                value={compose.subject}
                onChange={e => setCompose(c => ({ ...c, subject: e.target.value }))}
                required
                className="flex-1 py-2 bg-transparent text-[#DAE2FD] text-sm focus:outline-none placeholder:text-[#BBC9CD]/40"
              />
            </div>

            {/* Body */}
            <div className="relative flex-1 flex flex-col min-h-[220px]">
              <textarea
                placeholder="Write your message..."
                value={compose.body}
                onChange={e => setCompose(c => ({ ...c, body: e.target.value }))}
                className="flex-1 w-full px-4 py-3 bg-transparent text-[#DAE2FD] text-sm focus:outline-none resize-none min-h-[280px]"
              />
            </div>

            {/* Qwen assist panel */}
            {showQwenAssist && (
              <div className="border-t border-[#00FFFF]/10 bg-[#0D0D12] px-4 py-3 flex flex-col gap-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">Qwen Compose Assist</p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      vllmStatus === 'online' ? 'bg-green-400' :
                      vllmStatus === 'warming' ? 'bg-amber-400 animate-pulse' :
                      'bg-red-400'
                    }`} />
                    <span className={`text-xs ${
                      vllmStatus === 'online' ? 'text-green-400' :
                      vllmStatus === 'warming' ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {vllmStatus === 'online' ? 'Model online' :
                       vllmStatus === 'warming' ? 'Model warming up' :
                       'Model offline'}
                    </span>
                  </div>
                </div>
                <textarea
                  placeholder="What do you want to say?"
                  value={qwenPrompt}
                  onChange={e => setQwenPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#00FFFF]/20 text-[#DAE2FD] text-sm focus:outline-none focus:border-[#00FFFF]/40 resize-none placeholder:text-[#BBC9CD]/50"
                />
                {qwenError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {qwenError}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#BBC9CD] flex-shrink-0">Tone:</span>
                  {(['professional', 'casual', 'formal'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setQwenTone(t)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all capitalize ${
                        qwenTone === t
                          ? 'bg-[#00FFFF]/15 border-[#00FFFF]/50 text-[#00FFFF]'
                          : 'border-[#00FFFF]/20 text-[#BBC9CD] hover:border-[#00FFFF]/40 hover:text-[#DAE2FD]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    {vllmStatus !== 'online' && (
                      <button
                        type="button"
                        onClick={handleWarmupVllm}
                        disabled={warmingUp}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition-all disabled:opacity-50"
                      >
                        {warmingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {warmingUp ? 'Waking up...' : 'Wake up model'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleQwenWrite}
                      disabled={qwenLoading || vllmStatus !== 'online' || (!qwenPrompt.trim() && !compose.body.trim())}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_12px_rgba(0,255,255,0.3)] transition-all"
                    >
                      {qwenLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {qwenLoading ? 'Writing...' : 'Generate'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#00FFFF]/10 bg-[#111]/60 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowQwenAssist(v => !v); setQwenError(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    showQwenAssist
                      ? 'bg-[#00FFFF]/10 border-[#00FFFF]/50 text-[#00FFFF]'
                      : 'border-[#00FFFF]/20 text-[#BBC9CD] hover:text-[#00FFFF] hover:bg-[#00FFFF]/5'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Write with Qwen
                </button>
                {sendError && (
                  <span className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {sendError}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] font-bold text-sm hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
