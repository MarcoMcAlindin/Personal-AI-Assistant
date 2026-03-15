import { API_BASE_URL } from './api';
import { supabase } from './supabase';
import type { HealthSyncPayload } from './healthConnectService';

export const telemetryService = {
  syncHealthData: async (payload: HealthSyncPayload): Promise<{ synced: boolean; date: string }> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No active Supabase session — cannot sync health data');
    }

    const response = await fetch(`${API_BASE_URL}/health/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Health sync failed (${response.status}): ${text}`);
    }

    return response.json();
  },
};
