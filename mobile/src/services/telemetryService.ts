export interface HealthPayload {
  userId?: string;
  heartRate: number;
  sleepHours: number;
  timestamp: string;
}

export const telemetryService = {
  syncHealthData: async (data: HealthPayload) => {
    console.log('[TelemetryService] Syncing payload to backend:', JSON.stringify(data, null, 2));
    
    // TODO: Connect to Mr. Green's /health-sync endpoint
    // const response = await fetch('http://localhost:8000/api/v1/health-sync', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data),
    // });
    
    // if (!response.ok) throw new Error('Failed to sync telemetry');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return { success: true, message: 'Health data synced successfully' };
  }
};
