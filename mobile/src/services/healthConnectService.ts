/**
 * SuperCyan — Real Health Connect Service
 * Replaces healthSimulator.ts for production use.
 * Reads Samsung Watch biometrics via react-native-health-connect.
 */

import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

export interface HealthSyncPayload {
  heart_rate: number | null;
  sleep_duration: number | null;
  avg_heart_rate: number | null;
  steps: number | null;
  raw_watch_data: Record<string, unknown>;
  date: string;
  timestamp: string;
}

const PERMISSIONS = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Steps' },
] as const;

function get24hAgo(): Date {
  const d = new Date();
  d.setHours(d.getHours() - 24);
  return d;
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

export async function initAndRequestPermissions(): Promise<boolean> {
  const available = await isHealthConnectAvailable();
  if (!available) return false;

  await initialize();
  const granted = await requestPermission(PERMISSIONS);
  return granted.length === PERMISSIONS.length;
}

async function readHeartRate(startTime: Date): Promise<{ latest: number | null; avg: number | null; samples: number[] }> {
  try {
    const result = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    const samples: number[] = [];
    for (const record of result.records) {
      for (const sample of record.samples) {
        samples.push(sample.beatsPerMinute);
      }
    }

    if (samples.length === 0) return { latest: null, avg: null, samples: [] };

    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    const latest = samples[samples.length - 1];
    return { latest, avg, samples };
  } catch {
    return { latest: null, avg: null, samples: [] };
  }
}

async function readSleep(startTime: Date): Promise<{ durationHours: number | null; intervals: Array<{ start: string; end: string; type: string }> }> {
  try {
    const result = await readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    if (result.records.length === 0) return { durationHours: null, intervals: [] };

    let totalMs = 0;
    const intervals: Array<{ start: string; end: string; type: string }> = [];

    for (const session of result.records) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      totalMs += end - start;
      intervals.push({
        start: session.startTime,
        end: session.endTime,
        type: session.title || 'TOTAL_SLEEP',
      });
    }

    return { durationHours: Math.round((totalMs / 3_600_000) * 10) / 10, intervals };
  } catch {
    return { durationHours: null, intervals: [] };
  }
}

async function readSteps(startTime: Date): Promise<number | null> {
  try {
    const result = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    if (result.records.length === 0) return null;

    let total = 0;
    for (const record of result.records) {
      total += record.count;
    }
    return total;
  } catch {
    return null;
  }
}

export async function getLatestBiometrics(): Promise<HealthSyncPayload> {
  const startTime = get24hAgo();
  const now = new Date();

  const [heartRate, sleep, steps] = await Promise.all([
    readHeartRate(startTime),
    readSleep(startTime),
    readSteps(startTime),
  ]);

  return {
    heart_rate: heartRate.latest,
    avg_heart_rate: heartRate.avg,
    sleep_duration: sleep.durationHours,
    steps,
    raw_watch_data: {
      source: 'Samsung Health Connect',
      heart_rate_samples: heartRate.samples,
      sleep_intervals: sleep.intervals,
    },
    date: now.toISOString().split('T')[0],
    timestamp: now.toISOString(),
  };
}
