import React, { useState, useEffect } from 'react';
import { emailService } from '../../services/emailService';
import { Email } from '../../types/email';
import './Mail.css';

const EmailHub = (): JSX.Element => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getStatusClass = (status: string) => {
    return status === 'whitelisted' ? 'status-whitelisted' : 'status-pending';
  };

  return (
    <div className="email-container">
      <header className="email-header">
        <div className="title-group">
          <h1>Vibe Inbox</h1>
          <p className="text-muted">Personal Communication Hub</p>
        </div>
        <button className="compose-btn">
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
                  <span className="email-from">{email.from}</span>
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
    </div>
  );
};

export default EmailHub;
