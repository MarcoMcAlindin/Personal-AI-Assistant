import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import { Menu, Mail, Star, Inbox, Send, Edit, ArrowLeft, ArrowRight, CornerUpLeft, CornerUpRight } from "lucide-react";
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
              <p className="text-[#BBC9CD] mt-1">Whitelist active • {whitelistCount} approved senders</p>
            </div>

            <div className="flex items-center gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 flex flex-col gap-4">
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
          
          <div className="col-span-1 lg:col-span-2">
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
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0A0A0A] border border-[#00FFFF]/20 rounded-2xl shadow-2xl shadow-[#00FFFF]/10 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#00FFFF]/10 flex items-center justify-between bg-[#1A1A1A]/50">
              <h3 className="font-bold text-[#DAE2FD]">New Message</h3>
              <button onClick={() => setShowCompose(false)} className="text-[#BBC9CD] hover:text-white transition-colors">
                ✕
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
