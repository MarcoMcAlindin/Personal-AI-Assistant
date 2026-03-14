/**
 * Health Connect Simulator Service
 * Solves the hardware limitation of testing Samsung Watch biometric syncing within the IDE.
 * 
 * Capability: Injects dummy JSON payloads representing expected react-native-health-connect output.
 */

export interface SimulationMetric {
  date: string;
  water_liters: number;
  sleep_duration: number; // in hours
  avg_heart_rate: number;
  raw_watch_data: any;
}

const MOCK_HEALTH_DATA: SimulationMetric = {
  date: new Date().toISOString().split('T')[0],
  water_liters: 2.5,
  sleep_duration: 7.5,
  avg_heart_rate: 68,
  raw_watch_data: {
    source: 'Samsung Galaxy Watch 6 (Simulated)',
    heart_rate_samples: [65, 70, 68, 72, 65],
    sleep_intervals: [
      { start: '2026-03-14T23:00:00Z', end: '2026-03-15T06:30:00Z', type: 'TOTAL_SLEEP' }
    ]
  }
};

/**
 * Simulates the biometric sync process.
 * In a real scenario, this would call react-native-health-connect.
 */
export const getSimulatedHealthData = async (): Promise<SimulationMetric> => {
  return new Promise((resolve) => {
    console.log('[DEBUG] HealthConnectSimulator: Fetching mock biometrics...');
    setTimeout(() => {
      resolve(MOCK_HEALTH_DATA);
    }, 800); // Simulate network/hardware latency
  });
};

/**
 * Forces state population for a given component.
 */
export const syncBiometrics = async (onSuccess: (data: SimulationMetric) => void) => {
  try {
    const data = await getSimulatedHealthData();
    onSuccess(data);
    console.log('[DEBUG] HealthConnectSimulator: Sync successful.');
  } catch (error) {
    console.error('[DEBUG] HealthConnectSimulator: Sync failed.', error);
  }
};
