import { supabase } from './supabase';

export interface HealthMetric {
  date: string;
  water_liters: number;
  sleep_duration: number;
  avg_heart_rate: number;
  raw_watch_data: Record<string, unknown>;
  ai_analysis: string;
}

export const healthService = {
  getLatestMetrics: async (): Promise<HealthMetric | null> => {
    const { data, error } = await supabase
      .from('health_metrics')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[HealthService] Fetch Error:', error);
      return null;
    }
    return data;
  }
};
