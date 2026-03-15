import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { View, Text, commonStyles, Card } from '../../src/components/Themed';
import { theme } from '../../src/theme';
import {
  isHealthConnectAvailable,
  initAndRequestPermissions,
  getLatestBiometrics,
  type HealthSyncPayload,
} from '../../src/services/healthConnectService';
import { telemetryService } from '../../src/services/telemetryService';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'unavailable' | 'error';

export default function HealthScreen() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [healthData, setHealthData] = useState<HealthSyncPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // On-open sync pattern: fires when the screen mounts (user opens the app)
  useEffect(() => {
    syncBiometrics();
  }, []);

  const syncBiometrics = async () => {
    setStatus('syncing');
    setErrorMsg(null);

    const available = await isHealthConnectAvailable();
    if (!available) {
      setStatus('unavailable');
      return;
    }

    const permitted = await initAndRequestPermissions();
    if (!permitted) {
      setStatus('error');
      setErrorMsg('Health Connect permissions were denied.');
      return;
    }

    try {
      const biometrics = await getLatestBiometrics();
      setHealthData(biometrics);

      await telemetryService.syncHealthData(biometrics);
      setStatus('synced');
    } catch (error) {
      console.error('[HealthScreen] Sync failed:', error);
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : 'Sync failed');
    }
  };

  return (
    <View style={commonStyles.container}>
      <Text style={commonStyles.title}>Wellness Hub</Text>

      {status === 'unavailable' && (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={commonStyles.subtitle}>Health Connect Unavailable</Text>
          <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.sm }}>
            Connect your Samsung Watch to sync biometric data. Ensure the Health Connect app is installed on your device.
          </Text>
        </Card>
      )}

      {status === 'error' && (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[commonStyles.subtitle, { color: theme.colors.accentPrimary }]}>Sync Error</Text>
          <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.sm }}>
            {errorMsg}
          </Text>
        </Card>
      )}

      {healthData && (
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={commonStyles.subtitle}>
            Status: {status === 'synced' ? 'Synced' : 'Syncing...'}
          </Text>
          <View style={{ backgroundColor: 'transparent', marginTop: theme.spacing.sm }}>
            {healthData.avg_heart_rate != null && (
              <Text>• Heart Rate: <Text style={commonStyles.accentText}>{healthData.avg_heart_rate} BPM</Text></Text>
            )}
            {healthData.sleep_duration != null && (
              <Text>• Sleep: <Text style={commonStyles.accentText}>{healthData.sleep_duration} hrs</Text></Text>
            )}
            {healthData.steps != null && (
              <Text>• Steps: <Text style={commonStyles.accentText}>{healthData.steps.toLocaleString()}</Text></Text>
            )}
            <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>
              {healthData.date}
            </Text>
          </View>
        </Card>
      )}

      <TouchableOpacity
        onPress={syncBiometrics}
        disabled={status === 'syncing'}
        style={[
          styles.syncButton,
          { backgroundColor: status === 'syncing' ? theme.colors.bgSecondary : theme.colors.accentPrimary },
        ]}
      >
        {status === 'syncing' ? (
          <ActivityIndicator color={theme.colors.textPrimary} />
        ) : (
          <Text style={styles.buttonText}>
            {status === 'synced' ? 'Re-sync Telemetry' : 'Sync Telemetry'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  syncButton: {
    padding: theme.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
