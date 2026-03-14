import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../../src/theme';

export default function Screen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Wellness Hub</Text>
      <Text style={styles.subtext}>Biometric & Self-Care Tracking</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: palette.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtext: {
    color: palette.textMuted,
    fontSize: 16,
    marginTop: 8,
  },
});
