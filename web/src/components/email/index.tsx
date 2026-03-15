import React, { useState, useEffect } from 'react';
import { emailService } from '../../services/emailService';
import { Email } from '../../types/email';
import './Mail.css';

interface ComposeState {
  to: string;
  subject: string;
  body: string;
}

const EMPTY_COMPOSE: ComposeState = { to: '', subject: '', body: '' };

const EmailHub = (): JSX.Element => {
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
        if (data.length > 0) {
          setSelectedEmail(data[0]);
        }
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

  const closeCompose = () => {
    setShowCompose(false);
    setCompose(EMPTY_COMPOSE);
    setSendError(null);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compose.to.trim() || !compose.subject.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await emailService.sendEmail({ to: compose.to, subject: compose.subject, body: compose.body });
      closeCompose();
    } catch (err) {
      setSendError('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getStatusClass = (status: string) => {
    return status === 'whitelisted' ? 'status-whitelisted' : 'status-pending';
  };

  const whitelistCount = emails.filter(e => e.status === 'whitelisted').length;

  return (
    <div className="email-container">
      <header className="email-header">
        <div className="title-group">
          <h1>Vibe Inbox</h1>
          <p className="text-muted">
            Personal Communication Hub • Whitelist active • {whitelistCount} approved sender{whitelistCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="compose-btn" onClick={() => openCompose()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Compose
        </button>
      </header>

      <div className="email-layout">
        <div className="email-list">
          {loading ? (
            <div className="loading-state">Syncing emails...</div>
          ) : (
            emails.map(email => (
              <div
                key={email.id}
                className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''}`}
                onClick={() => setSelectedEmail(email)}
              >
                <div className="email-item-header">
                  <span className={`email-from ${!email.is_read ? 'unread' : ''}`}>{email.from}</span>
                  <span className={`email-status ${getStatusClass(email.status)}`}>
                    {email.status}
                  </span>
                </div>
                <div className="email-subject">{email.subject}</div>
                <div className="email-preview">{email.body}</div>
              </div>
            ))
          )}
        </div>

        <div className="email-view">
          {selectedEmail ? (
            <>
              <div className="email-view-header">
                <h2 className="email-view-subject">{selectedEmail.subject}</h2>
                <div className="email-view-meta">
                  <span>From: {selectedEmail.from}</span>
                  <span>{new Date(selectedEmail.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <div className="email-view-body">
                {selectedEmail.body}
              </div>
              <div className="email-view-actions">
                <button
                  className="email-action-btn"
                  onClick={() => openCompose({
                    to: selectedEmail.from,
                    subject: `Re: ${selectedEmail.subject}`,
                  })}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <polyline points="9 17 4 12 9 7"></polyline>
                    <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                  </svg>
                  Reply
                </button>
                <button
                  className="email-action-btn"
                  onClick={() => openCompose({
                    subject: `Fwd: ${selectedEmail.subject}`,
                  })}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <polyline points="15 17 20 12 15 7"></polyline>
                    <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
                  </svg>
                  Forward
                </button>
              </div>
            </>
          ) : (
            <div className="empty-view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.2 }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <p>Select a message to read</p>
            </div>
          )}
        </div>
      </div>

      {showCompose && (
        <div className="compose-overlay">
          <div className="compose-modal">
            <div className="compose-modal-header">
              <h3>New Message</h3>
              <button className="compose-close-btn" onClick={closeCompose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form className="compose-form" onSubmit={handleSendEmail}>
              <input
                className="compose-input"
                type="email"
                placeholder="To"
                value={compose.to}
                onChange={e => setCompose(c => ({ ...c, to: e.target.value }))}
                required
                autoFocus
              />
              <input
                className="compose-input"
                type="text"
                placeholder="Subject"
                value={compose.subject}
                onChange={e => setCompose(c => ({ ...c, subject: e.target.value }))}
                required
              />
              <textarea
                className="compose-input compose-body"
                placeholder="Write your message..."
                value={compose.body}
                onChange={e => setCompose(c => ({ ...c, body: e.target.value }))}
                rows={8}
              />
              {sendError && <p className="compose-error">{sendError}</p>}
              <div className="compose-form-actions">
                <button type="button" className="compose-cancel-action" onClick={closeCompose}>
                  Cancel
                </button>
                <button type="submit" className="compose-send-btn" disabled={sending}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailHub;
