// VibeOS Mobile -- Health Hub Screen
import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card } from '../components/Themed';
import { palette, spacing } from '../theme';
import { fetchHealth } from '../services/api';

const METRIC_ICONS = {
  'Sleep': '\uD83C\uDF19',
  'Avg HR': '\u2764\uFE0F',
  'Deep Sleep': '\uD83E\uDDE0',
  'REM': '\uD83C\uDF19',
};

function MetricCard({ label, value, unit, delta }) {
  const icon = METRIC_ICONS[label] || '';
  return (
    <Card style={{ flex: 1, margin: spacing.xs, padding: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        {icon ? <Text style={{ fontSize: 12, marginRight: spacing.xs }}>{icon}</Text> : null}
        <Text style={{ color: palette.textMuted, fontSize: 11 }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: 'bold' }}>{value ?? '--'}</Text>
      {delta !== undefined && (
        <Text style={{
          color: delta >= 0 ? palette.accentPrimary : '#ff6b6b',
          fontSize: 11, marginTop: 2,
        }}>
          {delta >= 0 ? '+' : ''}{delta}
        </Text>
      )}
    </Card>
  );
}

export default function HealthScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waterIntake, setWaterIntake] = useState(1.5);
  const waterGoal = 3.0;

  const loadData = async () => {
    try {
      const result = await fetchHealth();
      setData(result);
      if (result?.water_liters) setWaterIntake(result.water_liters);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bgPrimary, justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={palette.accentPrimary} />
      </SafeAreaView>
    );
  }

  const sleepHrs = data?.sleep_duration ? Math.floor(data.sleep_duration) : null;
  const sleepMin = data?.sleep_duration ? Math.round((data.sleep_duration % 1) * 60) : null;
  const sleepDisplay = sleepHrs != null ? `${sleepHrs}h ${sleepMin}m` : '--';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bgPrimary }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentPrimary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: palette.bgCard, alignItems: 'center', justifyContent: 'center',
            marginRight: spacing.md, borderWidth: 1, borderColor: palette.accentPrimary,
          }}>
            <Text style={{ fontSize: 18 }}>{'\u2764\uFE0F'}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>Health Hub</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
              Last synced: Today {data?.date ? '' : ''}{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* AI Morning Analysis */}
        {data?.ai_analysis && (
          <Card style={{ marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: palette.accentPrimary }}>
            <Text style={{ color: palette.accentPrimary, fontWeight: '600', fontSize: 13, marginBottom: spacing.sm }}>
              {'\u26A1'} AI Morning Analysis -- 8:00 AM
            </Text>
            <Text style={{ color: palette.textPrimary, fontSize: 13, lineHeight: 20 }}>
              {data.ai_analysis}
            </Text>
          </Card>
        )}

        {/* Metric cards 2x2 grid */}
        <View style={{ flexDirection: 'row', marginBottom: spacing.xs }}>
          <MetricCard label="Sleep" value={sleepDisplay} delta={data?.sleep_duration ? '+18m' : undefined} />
          <MetricCard label="Avg HR" value={data?.avg_heart_rate ? `${data.avg_heart_rate} bpm` : '--'} delta={data?.avg_heart_rate ? -2 : undefined} />
        </View>
        <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
          <MetricCard label="Deep Sleep" value="1h 48m" delta="+12%" />
          <MetricCard label="REM" value="1h 32m" delta="+5%" />
        </View>

        {/* Water Intake */}
        <Card style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ fontWeight: '600', fontSize: 15 }}>{'\uD83D\uDCA7'} Water Intake</Text>
            <Text style={{ color: palette.accentPrimary, fontSize: 13, fontWeight: '600' }}>
              {waterIntake.toFixed(1)}L / {waterGoal.toFixed(1)}L
            </Text>
          </View>
          {/* Progress bar */}
          <View style={{
            height: 8, backgroundColor: palette.bgSecondary, borderRadius: 4,
            overflow: 'hidden', marginBottom: spacing.md,
          }}>
            <View style={{
              height: '100%', width: `${Math.min((waterIntake / waterGoal) * 100, 100)}%`,
              backgroundColor: palette.accentPrimary, borderRadius: 4,
            }} />
          </View>
          {/* Controls */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => setWaterIntake(prev => Math.max(0, prev - 0.25))}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: palette.bgSecondary, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>-</Text>
            </TouchableOpacity>
            <Text style={{ color: palette.textMuted, fontSize: 13, marginHorizontal: spacing.md }}>
              +250ml per tap
            </Text>
            <TouchableOpacity
              onPress={() => setWaterIntake(prev => prev + 0.25)}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: palette.accentPrimary, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#000', fontSize: 18, fontWeight: 'bold' }}>+</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
