import React, { useState } from 'react';

const EmailHub = () => {
    const [emails, setEmails] = useState([
        { id: 1, from: "system@vibeos.com", subject: "Welcome to your Intelligence Dashboard", preview: "Your personal health sync is now active..." },
        { id: 2, from: "git-bot@github.com", subject: "Commit Successful", preview: "Merged feature/blue/16-ai-chat-ui into staging" }
    ]);

    return (
        <div className="email-hub">
            <h1 className="text-accent">Vibe Inbox</h1>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', height: '70vh' }}>
                <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
                    {emails.map(email => (
                        <div key={email.id} style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                            <h4>{email.subject}</h4>
                            <p className="text-muted" style={{ fontSize: '0.9rem' }}>{email.from}</p>
                            <p style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email.preview}</p>
                        </div>
                    ))}
                </div>
                <div className="card" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p className="text-muted">Select an email to view conversation history</p>
                </div>
            </div>
            <button className="send-btn" style={{ position: 'fixed', bottom: '24px', right: '24px', padding: 'var(--spacing-md) var(--spacing-xl)', borderRadius: '30px' }}>
                Compose +
            </button>
        </div>
    );
};

export default EmailHub;
