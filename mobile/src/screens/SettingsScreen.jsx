import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '../components/Themed';
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
  }, [pollVllmStatus]);

  useEffect(() => {
    let interval = null;
    if (vllmStatus === 'warming') {
      interval = setInterval(pollVllmStatus, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pollVllmStatus, vllmStatus]);

  const vllmColor = VLLM_STATUS_COLORS[vllmStatus] || '#ef4444';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bgPrimary }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: spacing.lg }}>Settings</Text>

        <Card style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="wifi" size={16} color={palette.accentPrimary} style={{ marginRight: 8 }} />
            <Text style={{ color: palette.accentPrimary, fontWeight: '600' }}>Connections</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>Gateway</Text>
            <Text style={{ color: '#4ade80', fontSize: 13 }}>Active</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>Supabase</Text>
            <Text style={{ color: '#4ade80', fontSize: 13 }}>Connected</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>Qwen3-Coder-30B</Text>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="link" size={16} color={palette.accentPrimary} style={{ marginRight: 8 }} />
            <Text style={{ color: palette.accentPrimary, fontWeight: '600' }}>Gateway URL</Text>
          </View>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>{API_BASE_URL}</Text>
        </Card>

        <Card style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="information-circle" size={16} color={palette.accentPrimary} style={{ marginRight: 8 }} />
            <Text style={{ color: palette.accentPrimary, fontWeight: '600' }}>App Info</Text>
          </View>
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
