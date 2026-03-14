import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { aiService, Message } from '../../services/aiService';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
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
    <div className="chat-interface">
      <div className="messages-list">
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} onSave={handleSave} />
        ))}
        {isLoading && !messages[messages.length-1].content && (
          <div className="typing-indicator">AI is focused...</div>
        )}
        <div ref={scrollRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
};

export default ChatInterface;
