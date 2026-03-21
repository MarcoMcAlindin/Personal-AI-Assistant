import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router";
import { Menu, MessageSquare, Send, Mic, Paperclip, Bookmark } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";
import { aiService, Message } from "../../services/aiService";

export function AIChatView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hello! I'm Super Cyan AI. How can I assist you today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const content = message;
    setMessage("");
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const aiMsgId = crypto.randomUUID();
    let currentAiContent = "";

    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: "" }]);

    try {
      await aiService.sendMessage(content, (token) => {
        currentAiContent += token;
        setMessages(prev => prev.map(m => 
          m.id === aiMsgId ? { ...m, content: currentAiContent } : m
        ));
      });
    } catch (error) {
      console.error('Chat failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (id: string) => {
    try {
      await aiService.saveMessage(id);
      setMessages(prev => prev.map(m => 
        m.id === id ? { ...m, isSaved: true } : m
      ));
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  return (
    <div className={`${isMobile ? 'pt-16 pb-8' : 'pl-64'} min-h-screen`}>
      {!isMobile && <Sidebar />}
      <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className={`${isMobile ? 'p-4' : 'p-8'} h-screen flex flex-col`}>
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
                <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                  AI Assistant
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                AI Chat
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-sm text-[#BBC9CD]">Online & Ready</span>
              </div>
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

        {/* Chat Area */}
        <GlassCard className="flex-1 flex flex-col !p-0 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A]"
                      : "bg-[#0D0D12]/50 border border-[#00FFFF]/20 text-[#DAE2FD]"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  {msg.role === 'assistant' && (
                    <button 
                      onClick={() => handleSave(msg.id)}
                      className={`mt-2 p-1 rounded hover:bg-[#1A1A1A]/50 transition-colors ${msg.isSaved ? 'text-[#00FFFF]' : 'text-[#BBC9CD]/50'}`}
                      title="Save / Pin this insight"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && !messages[messages.length-1]?.content && (
              <div className="flex justify-start">
                  <div className="max-w-[80%] p-4 rounded-2xl bg-[#0D0D12]/50 border border-[#00FFFF]/20 text-[#DAE2FD]/50 animate-pulse">
                      <p className="text-sm">AI is focused...</p>
                  </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-[#00FFFF]/20 p-4">
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-[#1A1A1A]/50 text-[#BBC9CD] hover:text-[#00FFFF] transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg hover:bg-[#1A1A1A]/50 text-[#BBC9CD] hover:text-[#00FFFF] transition-colors">
                <Mic className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading}
                placeholder="Ask Super Cyan AI anything..."
                className="flex-1 px-4 py-3 rounded-xl bg-[#0D0D12]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder:text-[#BBC9CD]/50 focus:outline-none focus:border-[#00FFFF]/40 transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !message.trim()}
                className="p-3 items-center justify-center flex rounded-xl bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
