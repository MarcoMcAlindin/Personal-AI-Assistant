import { ChevronRight, Circle, Moon } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '../components/Themed';
import { palette, spacing } from '../theme';
import { fetchHealth } from '../services/api';
import { MobileHeader } from '../components/MobileHeader';
import { MobileCard } from '../components/MobileCard';

export default function HealthScreen() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchHealth();
      setMetrics(data?.[0] || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const healthStats = [
    { id: 'steps', label: 'Steps Today', value: metrics?.steps || '0', icon: 'footsteps', color: '#00FFFF' },
    { id: 'calories', label: 'Calories', value: metrics?.calories || '0', icon: 'flame', color: '#f97316' },
    { id: 'heart', label: 'Heart Rate', value: metrics?.avg_heart_rate || '--', icon: 'pulse', color: '#f43f5e' },
    { id: 'active', label: 'Active Min', value: metrics?.active_minutes || '0', icon: 'stats-chart', color: '#22c55e' },
  ];

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={palette.accentPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <MobileHeader title="Health" subtitle="Wellness Tracking" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentPrimary} />}
      >
        <View style={styles.grid}>
          {healthStats.map((stat) => (
            <MobileCard key={stat.id} style={styles.statCard}>
              <View style={[styles.iconBox, { backgroundColor: `${stat.color}15`, borderColor: `${stat.color}30` }]}>
                <Circle size={22} color={stat.color}  />
              </View>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statUnit}>
                  {stat.id === 'steps' ? 'pts' : stat.id === 'calories' ? 'kcal' : stat.id === 'heart' ? 'bpm' : 'min'}
                </Text>
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </MobileCard>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>Deep Analysis</Text>
        </View>

        <MobileCard style={styles.analysisCard}>
          <LinearGradient
            colors={['rgba(0, 255, 255, 0.1)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.analysisCover}>
             <View style={styles.analysisIconBox}>
                <Moon size={28} color={palette.accentPrimary}  />
             </View>
             <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.analysisTitle}>Sleep Analysis</Text>
                <Text style={styles.analysisDesc}>Deep REM & recovery insights via Samsung Watch.</Text>
             </View>
             <TouchableOpacity style={styles.analysisButton}>
                <ChevronRight size={18} color={palette.accentPrimary}  />
             </TouchableOpacity>
          </View>
        </MobileCard>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '47.5%', 
    padding: 16,
    marginBottom: 16,
    borderRadius: 24,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
  },
  statUnit: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: palette.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  analysisCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 24,
  },
  analysisCover: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  analysisIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  analysisDesc: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  analysisButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
});
