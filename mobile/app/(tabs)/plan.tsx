import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../../src/theme';

export default function Screen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Daily Planner</Text>
      <Text style={styles.subtext}>Transient Task Management</Text>
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
