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

  getApplications: async (): Promise<Application[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/applications`, { headers });
    if (!res.ok) throw new Error("Failed to fetch apps");
    const data = await res.json();
    return data.applications;
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
  }
};
