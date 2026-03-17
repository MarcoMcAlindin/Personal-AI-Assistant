// VibeOS Mobile -- Settings Screen
import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, commonStyles } from '../components/Themed';
import { palette, spacing } from '../theme';
import { API_BASE_URL } from '../services/api';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView>
        <Text style={commonStyles.title}>Settings</Text>

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={{ color: palette.accentPrimary, fontWeight: '600', marginBottom: spacing.sm }}>Gateway</Text>
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
