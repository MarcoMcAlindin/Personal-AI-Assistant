import React from 'react';
import { Message } from '../../services/aiService';

interface MessageBubbleProps {
  message: Message;
  onSave: (id: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onSave }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'ai'}`}>
      <div className="message-bubble">
        <p>{message.content}</p>
        {!isUser && (
          <button 
            onClick={() => onSave(message.id)} 
            className={`save-btn ${message.isSaved ? 'saved' : ''}`}
            title="Pin to RAG Memory"
          >
            {message.isSaved ? '★' : '☆'}
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
