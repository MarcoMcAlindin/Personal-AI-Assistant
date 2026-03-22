import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../theme';
import { MobileHeader } from '../components/MobileHeader';

export default function MoneyScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <MobileHeader title="Money Hub" subtitle="Track finances & spending" />
      <View style={styles.content}>
        <Text style={styles.text}>Money Features Coming Soon...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: palette.textSecondary,
    fontSize: 16,
  }
});
