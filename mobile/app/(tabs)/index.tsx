import { View, Text, commonStyles, Card } from '../../src/components/Themed';
import { theme } from '../../src/theme';

export default function DashboardScreen() {
  return (
    <View style={commonStyles.container}>
      <Text style={commonStyles.title}>Dashboard</Text>
      
      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={commonStyles.subtitle}>Welcome back, SuperCyan User.</Text>
        <Text>Your assistant is ready.</Text>
      </Card>

      <Card>
        <Text style={[commonStyles.subtitle, commonStyles.accentText]}>Daily Summary</Text>
        <Text>• 3 tasks remaining</include>
        <Text>• 1 high priority email</Text>
      </Card>
    </View>
  );
}
