import { Email, EmailSendRequest } from '../types/email';
import { supabase } from './supabase';

const BACKEND_URL = import.meta.env.VITE_CLOUD_GATEWAY_URL || 'http://localhost:8000/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { 'Content-Type': 'application/json' };
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export const emailService = {
  fetchInbox: async (): Promise<Email[]> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/email/inbox`, { headers });
      if (!response.ok) throw new Error('Fetch Inbox Failed');
      const data = await response.json();
      const emails: Email[] = data.emails ?? [];
      // Sort latest first by internalDate
      return emails.sort((a, b) => Number(b.date ?? 0) - Number(a.date ?? 0));
    } catch (error) {
      console.error('[EmailService] Fetch Error:', error);
      return [];
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
  },

  getGoogleAuthUrl: async (): Promise<string> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/auth/google/authorize`, { headers });
    if (!response.ok) throw new Error('Google Auth URL fetch failed');
    const data = await response.json();
    return data.authorization_url;
  },

  getGoogleStatus: async (): Promise<{ connected: boolean; email: string | null }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/auth/google/status`, { headers });
    if (!response.ok) throw new Error('Google status fetch failed');
    const data = await response.json();
    return {
      connected: data.gmail?.connected ?? false,
      email: data.gmail?.email ?? null,
    };
  },

  disconnectGoogle: async (): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/auth/google/disconnect`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Google disconnect failed');
  },

  searchContacts: async (q: string): Promise<Array<{ name: string; email: string }>> => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BACKEND_URL}/email/contacts?q=${encodeURIComponent(q)}`,
      { headers }
    );
    if (!response.ok) throw new Error('Contact search failed');
    const data = await response.json();
    return data.contacts ?? [];
  },

  getWhitelist: async (): Promise<Array<{ id: string; email_address: string; contact_name: string }>> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/email/whitelist`, { headers });
    if (!response.ok) throw new Error('Get whitelist failed');
    const data = await response.json();
    return data.whitelist ?? [];
  },

  addToWhitelist: async (email_address: string, contact_name: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/email/whitelist`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email_address, contact_name }),
    });
    if (!response.ok) throw new Error('Add to whitelist failed');
  },

  removeFromWhitelist: async (id: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/email/whitelist/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Remove from whitelist failed');
  },

  fetchEmailBody: async (emailId: string): Promise<{ body: string; html: string | null; attachments: Array<{ filename: string; mimeType: string; data: string }> }> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/email/${emailId}`, { headers });
      if (!response.ok) return { body: '', html: null, attachments: [] };
      return response.json();
    } catch {
      return { body: '', html: null, attachments: [] };
    }
  },

  rewriteEmail: async (body: string, tone: string): Promise<string> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/email/rewrite`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body, tone }),
    });
    if (!response.ok) throw new Error('Email rewrite failed');
    const data = await response.json();
    if (!data.rewritten) throw new Error(data.error || 'Qwen returned empty response');
    return data.rewritten;
  },

  registerPushToken: async (token: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/users/push-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token }),
    });
    if (!response.ok) throw new Error('Push token registration failed');
  },
};
