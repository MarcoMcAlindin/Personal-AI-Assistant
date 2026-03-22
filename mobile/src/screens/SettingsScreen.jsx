import { Cloud, Code, Cpu, Database, Info, Smartphone } from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '../components/Themed';
import { palette, spacing } from '../theme';
import { API_BASE_URL, fetchVllmStatus } from '../services/api';
import { MobileHeader } from '../components/MobileHeader';
import { MobileCard } from '../components/MobileCard';
import { LinearGradient } from 'expo-linear-gradient';

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
    <SafeAreaView style={styles.root} edges={['top']}>
      <MobileHeader title="Settings" subtitle="System Control Center" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>System Connectivity</Text>
        </View>

        <MobileCard style={styles.connCard}>
          <LinearGradient
            colors={['rgba(0, 255, 255, 0.1)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={styles.connItem}>
            <View style={[styles.iconBox, { borderColor: '#4ade8050' }]}>
              <Cloud size={20} color="#4ade80"  />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.connName}>Cloud Gateway</Text>
              <Text style={styles.connUrl}>{API_BASE_URL.replace('https://', '')}</Text>
            </View>
            <Text style={[styles.badge, styles.badgeActive]}>ACTIVE</Text>
          </View>

          <View style={styles.connDivider} />

          <View style={styles.connItem}>
            <View style={[styles.iconBox, { borderColor: vllmColor + '50' }]}>
              <Cpu size={20} color={vllmColor}  />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.connName}>Qwen3 AI Core</Text>
              <Text style={styles.connUrl}>vLLM GGUF (30B-A3B)</Text>
            </View>
            <Text style={[styles.badge, { color: vllmColor, borderColor: vllmColor }]}>
              {VLLM_STATUS_LABELS[vllmStatus].toUpperCase()}
            </Text>
          </View>

          <View style={styles.connDivider} />

          <View style={styles.connItem}>
            <View style={[styles.iconBox, { borderColor: '#4ade8050' }]}>
              <Database size={20} color="#4ade80"  />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.connName}>Supabase DB</Text>
              <Text style={styles.connUrl}>PostgreSQL + Vector</Text>
            </View>
            <Text style={[styles.badge, styles.badgeActive]}>CONNECTED</Text>
          </View>
        </MobileCard>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>Application</Text>
        </View>

        <MobileCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <Info size={20} color={palette.textSecondary}  />
              <Text style={styles.infoLabel}>Version</Text>
            </View>
            <Text style={styles.infoValue}>v0.2.1-cyan</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <Code size={20} color={palette.textSecondary}  />
              <Text style={styles.infoLabel}>Environment</Text>
            </View>
            <Text style={styles.infoValue}>Production</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <Smartphone size={20} color={palette.textSecondary}  />
              <Text style={styles.infoLabel}>SDK</Text>
            </View>
            <Text style={styles.infoValue}>Expo 54 (SDK)</Text>
          </View>
        </MobileCard>

        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>TERMINATE SESSION</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingLeft: 4,
    marginTop: 8,
  },
  sectionIndicator: {
    height: 1,
    width: 40,
    backgroundColor: 'rgba(0, 255, 255, 0.4)',
  },
  sectionTitle: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  connCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 24,
    marginBottom: 32,
  },
  connItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  connName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  connUrl: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  badge: {
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    letterSpacing: 0.5,
  },
  badgeActive: {
    color: '#4ade80',
    borderColor: 'rgba(74, 222, 128, 0.3)',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  connDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
  },
  infoCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 24,
    marginBottom: 40,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: palette.textSecondary,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '800',
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 18,
  },
  logoutButton: {
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#f43f5e',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
