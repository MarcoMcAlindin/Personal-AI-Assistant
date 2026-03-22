import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router";
import { Menu, Mail, Star, Inbox, Send, Edit, ArrowLeft, ArrowRight, CornerUpLeft, CornerUpRight, Shield, X, Plus, Search } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";
import { emailService } from "../../services/emailService";
import { Email } from "../../types/email";

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

const EMPTY_COMPOSE: ComposeState = { to: '', subject: '', body: '' };

export function EmailView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);

  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState<ComposeState>(EMPTY_COMPOSE);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Whitelist panel state
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

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const data = await emailService.fetchInbox();
        setEmails(data);
        if (data.length > 0) setSelectedEmail(data[0]);
      } catch (error) {
        console.error('Failed to fetch emails:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmails();
  }, []);

  // Load whitelist when panel opens
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
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
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
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Dismiss dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setAddEmail('');
      setAddName('');
      setSearchQuery('');
      setSuggestions([]);
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
    } catch (err) {
      setSendError('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const whitelistCount = emails.filter(e => e.status === 'whitelisted').length;

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
                  Personal Communication
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                Vibe Inbox
              </h1>
              <p className="text-[#BBC9CD] mt-1">Whitelist active -- {whitelistCount} approved senders</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWhitelist(v => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                  showWhitelist
                    ? 'bg-[#00FFFF]/10 border-[#00FFFF]/50 text-[#00FFFF]'
                    : 'border-[#00FFFF]/20 text-[#BBC9CD] hover:text-[#00FFFF] hover:bg-[#00FFFF]/5'
                }`}
              >
                <Shield className="w-4 h-4" />
                {!isMobile && "Manage Whitelist"}
              </button>
              <button onClick={() => openCompose()} className="flex items-center gap-2 p-3 font-semibold rounded-xl bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all">
                <Edit className="w-5 h-5" />
                {!isMobile && "Compose"}
              </button>
              {isMobile && (
                <button
                  onClick={() => setMenuOpen(true)}
                  className="p-3 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors border border-[#00FFFF]/20"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className={`grid gap-6 ${showWhitelist ? 'grid-cols-1 xl:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Email list */}
          <div className={`${showWhitelist ? 'xl:col-span-1' : 'col-span-1'} flex flex-col gap-4`}>
            {loading ? (
              <div className="text-[#BBC9CD] p-4 text-center">Syncing emails...</div>
            ) : emails.length === 0 ? (
              <div className="text-[#BBC9CD] p-4 text-center">Inbox empty</div>
            ) : (
              emails.map(email => (
                <GlassCard
                  key={email.id}
                  className={`!p-4 hover:border-[#00FFFF]/40 transition-all cursor-pointer ${
                    selectedEmail?.id === email.id ? 'border-[#00FFFF]/50 bg-[#00FFFF]/5' : ''
                  } ${!email.is_read ? 'border-[#00FFFF]/30' : ''}`}
                  onClick={() => setSelectedEmail(email)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${!email.is_read ? 'bg-[#00FFFF]' : 'bg-transparent'}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`font-semibold truncate ${!email.is_read ? 'text-[#DAE2FD]' : 'text-[#BBC9CD]'}`}>
                          {email.from}
                        </span>
                        <span className="text-xs text-[#BBC9CD] flex-shrink-0">
                          {new Date(email.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className={`text-sm mb-1 truncate ${!email.is_read ? 'text-[#DAE2FD]' : 'text-[#BBC9CD]'}`}>{email.subject}</p>
                      <span className={`text-xs px-2 py-0.5 rounded flex items-center w-max ${email.status === 'whitelisted' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {email.status}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>

          {/* Email reader */}
          <div className={`${showWhitelist ? 'xl:col-span-2' : 'col-span-1 lg:col-span-2'}`}>
            {selectedEmail ? (
              <GlassCard className="min-h-[500px] flex flex-col">
                <div className="pb-6 border-b border-[#00FFFF]/10 mb-6">
                  <h2 className="text-2xl font-bold text-[#DAE2FD] mb-4">{selectedEmail.subject}</h2>
                  <div className="flex items-center justify-between text-sm text-[#BBC9CD]">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#00FFFF]/20">From: {selectedEmail.from}</span>
                    </div>
                    <span>{new Date(selectedEmail.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex-1 text-[#DAE2FD] text-lg leading-relaxed whitespace-pre-wrap">
                  {selectedEmail.body}
                </div>

                <div className="pt-6 border-t border-[#00FFFF]/10 mt-6 flex gap-4">
                  <button
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#00FFFF]/20 text-[#00FFFF] hover:bg-[#00FFFF]/10 transition-colors"
                    onClick={() => openCompose({ to: selectedEmail.from, subject: `Re: ${selectedEmail.subject}` })}
                  >
                    <CornerUpLeft className="w-5 h-5" /> Reply
                  </button>
                  <button
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#00FFFF]/20 text-[#00FFFF] hover:bg-[#00FFFF]/10 transition-colors"
                    onClick={() => openCompose({ subject: `Fwd: ${selectedEmail.subject}` })}
                  >
                    <CornerUpRight className="w-5 h-5" /> Forward
                  </button>
                </div>
              </GlassCard>
            ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-[#BBC9CD]/50 border-2 border-dashed border-[#BBC9CD]/20 rounded-2xl">
                <Mail className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">Select a message to read</p>
              </div>
            )}
          </div>

          {/* Whitelist panel */}
          {showWhitelist && (
            <div className="xl:col-span-1">
              <div className="bg-[#0D0D12] border border-[#00FFFF]/20 rounded-xl p-4 flex flex-col gap-4 min-h-[500px]">
                <div className="flex items-center justify-between">
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

                {/* Contact search input */}
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBC9CD]" />
                    <input
                      type="text"
                      placeholder="Search contacts or type email..."
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setAddEmail(e.target.value);
                        setAddName('');
                      }}
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
                          onMouseDown={e => {
                            e.preventDefault();
                            handleSuggestionSelect(contact);
                          }}
                        >
                          <span className="text-sm font-semibold text-[#DAE2FD]">{contact.name || contact.email}</span>
                          {contact.name && (
                            <span className="text-xs text-[#BBC9CD] ml-2">{contact.email}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add button */}
                <button
                  onClick={handleAddToWhitelist}
                  disabled={!addEmail.trim() || addingEntry}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(0,255,255,0.3)] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {addingEntry ? 'Adding...' : 'Add to whitelist'}
                </button>

                {addError && <p className="text-red-400 text-xs">{addError}</p>}

                {/* Current whitelist */}
                <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                  <span className="text-xs text-[#BBC9CD] uppercase tracking-widest font-semibold">
                    Approved senders
                  </span>

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
          )}
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0A0A0A] border border-[#00FFFF]/20 rounded-2xl shadow-2xl shadow-[#00FFFF]/10 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#00FFFF]/10 flex items-center justify-between bg-[#1A1A1A]/50">
              <h3 className="font-bold text-[#DAE2FD]">New Message</h3>
              <button onClick={() => setShowCompose(false)} className="text-[#BBC9CD] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form className="p-6 flex flex-col gap-4" onSubmit={handleSendEmail}>
              <input
                type="email"
                placeholder="To"
                value={compose.to}
                onChange={e => setCompose(c => ({ ...c, to: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] focus:outline-none focus:border-[#00FFFF]/40"
              />
              <input
                type="text"
                placeholder="Subject"
                value={compose.subject}
                onChange={e => setCompose(c => ({ ...c, subject: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] focus:outline-none focus:border-[#00FFFF]/40"
              />
              <textarea
                placeholder="Write your message..."
                value={compose.body}
                onChange={e => setCompose(c => ({ ...c, body: e.target.value }))}
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A]/50 border border-[#00FFFF]/20 text-[#DAE2FD] focus:outline-none focus:border-[#00FFFF]/40 resize-none"
              />
              {sendError && <p className="text-red-400 text-sm">{sendError}</p>}
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowCompose(false)} className="px-6 py-2 rounded-xl text-[#BBC9CD] hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={sending} className="px-8 py-2 rounded-xl bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] font-bold hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all flex items-center gap-2">
                  <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
