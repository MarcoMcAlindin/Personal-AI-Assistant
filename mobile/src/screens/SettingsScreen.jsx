// VibeOS Mobile -- Settings Screen
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, commonStyles } from '../components/Themed';
import { palette, spacing } from '../theme';
import { API_BASE_URL, fetchVllmStatus } from '../services/api';

const VLLM_STATUS_COLORS = {
  offline: '#ef4444',
  warming: '#eab308',
  online: '#4ade80',
};

const VLLM_STATUS_LABELS = {
  offline: 'Offline',
  warming: 'Warming Up...',
  online: 'Online',
};

export default function SettingsScreen() {
  const [vllmStatus, setVllmStatus] = useState('offline');

  const pollVllmStatus = useCallback(async () => {
    try {
      const { status } = await fetchVllmStatus();
      setVllmStatus(status);
    } catch {
      setVllmStatus('offline');
    }
  }, []);

  useEffect(() => {
    pollVllmStatus();
    const interval = setInterval(pollVllmStatus, 15000);
    return () => clearInterval(interval);
  }, [pollVllmStatus]);

  const vllmColor = VLLM_STATUS_COLORS[vllmStatus] || '#ef4444';

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView>
        <Text style={commonStyles.title}>Settings</Text>

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={{ color: palette.accentPrimary, fontWeight: '600', marginBottom: spacing.sm }}>Connections</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>Gateway</Text>
            <Text style={{ color: '#4ade80', fontSize: 13 }}>Active</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>Supabase</Text>
            <Text style={{ color: '#4ade80', fontSize: 13 }}>Connected</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>Qwen3.5-9B-Instruct</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: vllmColor, marginRight: 6,
              }} />
              <Text style={{ color: vllmColor, fontSize: 13 }}>{VLLM_STATUS_LABELS[vllmStatus]}</Text>
            </View>
          </View>
        </Card>

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={{ color: palette.accentPrimary, fontWeight: '600', marginBottom: spacing.sm }}>Gateway URL</Text>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>{API_BASE_URL}</Text>
        </Card>

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={{ color: palette.accentPrimary, fontWeight: '600', marginBottom: spacing.sm }}>App Info</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>Version</Text>
            <Text style={{ fontSize: 13 }}>0.1.0</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>SDK</Text>
            <Text style={{ fontSize: 13 }}>Expo 54</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
