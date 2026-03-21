import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { aiService, Message } from "../../services/aiService";

export function AIFloatingBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hello! I'm your Super Cyan AI assistant. How can I help you today?", timestamp: Date.now() }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    let aiContent = "";
    const aiMsgId = (Date.now() + 1).toString();
    
    setMessages(prev => [...prev, { id: aiMsgId, role: "assistant", content: "", timestamp: Date.now() }]);

    try {
      await aiService.sendMessage(userMsg.content, (chunk) => {
        aiContent += chunk;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m));
      });
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: "Error connecting to AI. Please try again or check the network connection." } : m));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Chat Overlay */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-md">
          <GlassCard className="!p-0 overflow-hidden shadow-2xl shadow-[#00FFFF]/10 border-[#00FFFF]/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00FFFF]/20 to-[#0099CC]/20 border-b border-[#00FFFF]/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#00FFFF]/20">
                    <MessageSquare className="w-5 h-5 text-[#00FFFF]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#DAE2FD]">Super Cyan AI</h3>
                    <div className="flex items-center gap-2">
                       {isTyping ? (
                          <>
                             <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></div>
                             <span className="text-xs text-[#BBC9CD]">Thinking...</span>
                          </>
                       ) : (
                          <>
                             <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                             <span className="text-xs text-[#BBC9CD]">Online</span>
                          </>
                       )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-[#1A1A1A]/50 text-[#BBC9CD] hover:text-[#00FFFF] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A]"
                        : "bg-[#0D0D12]/50 border border-[#00FFFF]/20 text-[#DAE2FD]"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-[#00FFFF]/20 p-4 bg-[#1A1A1A]/50">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0D0D12]/50 border border-[#00FFFF]/20 text-[#DAE2FD] placeholder:text-[#BBC9CD]/50 focus:outline-none focus:border-[#00FFFF]/40 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={isTyping || !input.trim()}
                  className="p-3 rounded-xl bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Floating Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-[#00FFFF] to-[#0099CC] text-[#0A0A0A] shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.7)] transition-all hover:scale-110"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
      </button>
    </>
  );
}
