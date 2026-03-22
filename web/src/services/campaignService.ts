import { supabase } from './supabase';
import { Database } from '../types/supabase';

type Campaign = Database['public']['Tables']['campaigns']['Row'];
type CampaignInsert = Database['public']['Tables']['campaigns']['Insert'];
type InboxItem = Database['public']['Tables']['inbox_items']['Row'];
type Application = Database['public']['Tables']['applications']['Row'];

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {})
  };
};

export const campaignService = {
  getCampaigns: async (): Promise<Campaign[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/campaigns`, { headers });
    if (!res.ok) throw new Error("Failed to fetch campaigns");
    const data = await res.json();
    return data.campaigns;
  },

  createCampaign: async (input: any): Promise<Campaign> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: input.name,
        job_preferences: input.job_preferences,
        search_frequency_hours: input.search_frequency_hours || 12
      })
    });
    if (!res.ok) throw new Error(`Create Campaign Failed: ${res.statusText}`);
    return res.json();
  },

  getInboxItems: async (campaignId?: string): Promise<InboxItem[]> => {
    const headers = await getAuthHeaders();
    const url = campaignId ? `${API_BASE}/inbox?campaign_id=${campaignId}` : `${API_BASE}/inbox`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Failed to fetch inbox");
    const data = await res.json();
    return data.inbox_items;
  },

  updateInboxStatus: async (itemId: string, status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED'): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/inbox/${itemId}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error("Failed to update status");
  },

  createApplication: async (inboxItemId: string, coverLetterText: string): Promise<Application> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/applications`, {
      method: "POST",
      headers,
      body: JSON.stringify({ inbox_item_id: inboxItemId, cover_letter_text: coverLetterText })
    });
    if (!res.ok) throw new Error(`Create application failed: ${res.statusText}`);
    return res.json();
  },

  getApplications: async (): Promise<Application[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/applications`, { headers });
    if (!res.ok) throw new Error("Failed to fetch apps");
    const data = await res.json();
    return data.applications;
  },

  generateCoverLetter: async (inboxItemId: string): Promise<string> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/applications/cover-letter`, {
      method: "POST",
      headers,
      body: JSON.stringify({ inbox_item_id: inboxItemId })
    });
    if (!res.ok) throw new Error(`Cover letter generation failed: ${res.statusText}`);
    const data = await res.json();
    return data.cover_letter_text;
  },

  triggerScrapeRun: async (campaignId: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/scrapers/run/${campaignId}`, {
      method: 'POST',
      headers
    });
    if (!response.ok) {
        throw new Error(`Scrape Trigger Failed: ${response.statusText}`);
    }
    return response.json();
  },

  deleteCampaign: async (campaignId: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error(`Delete campaign failed: ${res.statusText}`);
  },

  uploadCV: async (file: File): Promise<{ cv: any; chars_extracted: number }> => {
    const { data: { session } } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/cv/upload`, {
      method: 'POST',
      headers: session ? { 'Authorization': `Bearer ${session.access_token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `CV upload failed: ${res.statusText}`);
    }
    return res.json();
  },

  listCVs: async (): Promise<any[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/cv`, { headers });
    if (!res.ok) throw new Error('Failed to fetch CVs');
    const data = await res.json();
    return data.cvs;
  },

  getCV: async (cvId: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/cv/${cvId}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch CV');
    return res.json();
  },

  getPrimaryCV: async (): Promise<{ parsed_text: string } | null> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/cv/primary`, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch primary CV');
    return res.json();
  },

  setPrimaryCV: async (cvId: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/cv/${cvId}/set-primary`, { method: 'PATCH', headers });
    if (!res.ok) throw new Error('Failed to set primary CV');
  },

  deleteCV: async (cvId: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/cv/${cvId}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Failed to delete CV');
  },

  confirmApplication: async (applicationId: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/applications/${applicationId}/confirm`, { method: 'PATCH', headers });
    if (!res.ok) throw new Error('Failed to confirm application');
    return res.json();
  },

  regenerateCoverLetter: async (applicationId: string, inboxItemId: string): Promise<string> => {
    const headers = await getAuthHeaders();
    // Generate the text
    const genRes = await fetch(`${API_BASE}/applications/cover-letter`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ inbox_item_id: inboxItemId }),
    });
    if (!genRes.ok) throw new Error(`Cover letter generation failed: ${genRes.statusText}`);
    const { cover_letter_text } = await genRes.json();
    // Save it back to the application row
    const saveRes = await fetch(`${API_BASE}/applications/${applicationId}/cover-letter`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ cover_letter_text }),
    });
    if (!saveRes.ok) throw new Error(`Failed to save cover letter: ${saveRes.statusText}`);
    return cover_letter_text;
  },

  generateInterviewQuestions: async (applicationId: string): Promise<string[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/applications/${applicationId}/interview-questions`, { method: 'POST', headers });
    if (!res.ok) throw new Error('Failed to generate questions');
    const data = await res.json();
    return data.interview_questions;
  },

  deleteApplication: async (applicationId: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/applications/${applicationId}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(`Delete application failed: ${res.statusText}`);
  },
};
