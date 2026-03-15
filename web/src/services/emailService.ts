import { Email, EmailSendRequest } from '../types/email';

const BACKEND_URL = import.meta.env.VITE_CLOUD_GATEWAY_URL || 'http://localhost:8000/api/v1';

export const emailService = {
  fetchInbox: async (): Promise<Email[]> => {
    try {
      const response = await fetch(`${BACKEND_URL}/email/inbox`);
      if (!response.ok) throw new Error('Fetch Inbox Failed');
      const data = await response.json();
      return data.emails;
    } catch (error) {
      console.error('[EmailService] Fetch Error:', error);
      // Fallback for demo
      return [
        { 
          id: '1', 
          from: "system@vibeos.com", 
          subject: "Welcome to your Intelligence Dashboard", 
          body: "Your personal health sync is now active...", 
          timestamp: new Date().toISOString(),
          is_read: false,
          status: 'whitelisted'
        },
        { 
          id: '2', 
          from: "unknown@spam.com", 
          subject: "Limited Offer!", 
          body: "Buy this now...", 
          timestamp: new Date().toISOString(),
          is_read: false,
          status: 'pending'
        }
      ];
    }
  },

  sendEmail: async (request: EmailSendRequest): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!response.ok) throw new Error('Send Email Failed');
    } catch (error) {
      console.error('[EmailService] Send Error:', error);
      throw error;
    }
  }
};
