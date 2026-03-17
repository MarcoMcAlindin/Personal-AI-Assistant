// VibeOS Mobile -- Root App Component
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text as RNText } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './navigation/TabNavigator';
import { palette } from './theme';
import { supabase } from './services/supabase';

const navTheme = {
  dark: true,
  colors: {
    primary: palette.accentPrimary,
    background: palette.bgPrimary,
    card: palette.bgSecondary,
    text: palette.textPrimary,
    border: palette.borderColor,
    notification: palette.accentPrimary,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '900' },
  },
};

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Check for existing session first
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        return;
      }
      // Auto sign-in with CEO test account
      await supabase.auth.signInWithPassword({
        email: 'ceo@vibeos.app',
        password: 'testpass123',
      });
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bgPrimary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={palette.accentPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: palette.bgPrimary }}>
          <TabNavigator />
          <View style={{ alignItems: 'center', paddingBottom: 6, backgroundColor: '#000000' }}>
            <RNText style={{ color: palette.textMuted, fontSize: 10 }}>
              VibeOS Mobile — React Native (Expo)
            </RNText>
          </View>
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
