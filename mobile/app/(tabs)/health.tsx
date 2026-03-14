import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { View, Text, commonStyles, Card } from '../../src/components/Themed';
import { theme } from '../../src/theme';
import { getMockBiometrics } from '../../src/services/healthSimulator';
import { telemetryService, HealthPayload } from '../../src/services/telemetryService';

export default function HealthScreen() {
  const [syncing, setSyncing] = useState(false);
  const [healthData, setHealthData] = useState<HealthPayload | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const mockData = getMockBiometrics();
      const payload: HealthPayload = {
        heartRate: mockData.heartRate,
        sleepHours: mockData.sleepDuration / 60, // minutes to hours
        timestamp: new Date().toISOString(),
      };

      await telemetryService.syncHealthData(payload);
      setHealthData(payload);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={commonStyles.container}>
      <Text style={commonStyles.title}>Wellness Hub</Text>
      
      <Card style={{ marginBottom: theme.spacing.lg }}>
        <Text style={commonStyles.subtitle}>Status: {healthData ? 'Synced' : 'Not Synced'}</Text>
        {healthData && (
          <View style={{ backgroundColor: 'transparent', marginTop: theme.spacing.sm }}>
            <Text>• Heart Rate: <Text style={commonStyles.accentText}>{Math.round(healthData.heartRate)} BPM</Text></Text>
            <Text>• Sleep: <Text style={commonStyles.accentText}>{healthData.sleepHours.toFixed(1)} hrs</include></Text>
          </View>
        )}
      </Card>

      <TouchableOpacity 
        onPress={handleSync} 
        disabled={syncing}
        style={[
          styles.syncButton, 
          { backgroundColor: syncing ? theme.colors.bgSecondary : theme.colors.accentPrimary }
        ]}
      >
        {syncing ? (
          <ActivityIndicator color={theme.colors.textPrimary} />
        ) : (
          <Text style={styles.buttonText}>Sync Telemetry</Text>
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
  }
});
