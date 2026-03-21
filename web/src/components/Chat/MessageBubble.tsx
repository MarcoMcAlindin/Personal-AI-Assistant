import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    className="code-block"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        {!isUser && (
          <div className="message-actions">
            <button 
              onClick={() => onSave(message.id!)} 
              className={`save-btn ${message.isSaved ? 'pinned' : ''}`}
              title={message.isSaved ? "Pinned to RAG" : "Pin to RAG Memory"}
            >
              {message.isSaved ? '★' : '☆'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
