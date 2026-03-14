import { View, Text, commonStyles } from '../../src/components/Themed';

export default function MailScreen() {
  return (
    <View style={commonStyles.container}>
      <Text style={commonStyles.title}>Inbox</Text>
      <Text style={commonStyles.subtitle}>Unified Communications</Text>
    </View>
  );
}
