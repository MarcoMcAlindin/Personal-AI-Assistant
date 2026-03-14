import { View, Text, commonStyles } from '../../src/components/Themed';

export default function AIScreen() {
  return (
    <View style={commonStyles.container}>
      <Text style={commonStyles.title}>AI Box</Text>
      <Text style={commonStyles.subtitle}>Chat with VibeOS AI</Text>
    </View>
  );
}
