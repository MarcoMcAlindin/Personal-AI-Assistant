import { View, Text, commonStyles } from '../../src/components/Themed';

export default function PlanScreen() {
  return (
    <View style={commonStyles.container}>
      <Text style={commonStyles.title}>Planner</Text>
      <Text style={commonStyles.subtitle}>Daily Schedule</Text>
    </View>
  );
}
