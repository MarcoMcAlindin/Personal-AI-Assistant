// SuperCyan Mobile -- Root App Component
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text as RNText } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './navigation/TabNavigator';
import { AIFloatingBubble } from './components/AIFloatingBubble';
import { palette } from './theme';
import { supabase } from './services/supabase';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from './services/api';

// Show notifications when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('email', {
      name: 'Email Notifications',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;
    await registerPushToken(pushToken);
  } catch (err) {
    console.warn('[PushNotifications] Token registration failed:', err);
  }
}


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
  const navigationRef = useRef(null);
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    (async () => {
      // Hide navigation bar on Android for immersive experience
      if (Platform.OS === 'android') {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('inset-touch');
      }

      // Check for existing session first
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setReady(true);
        await registerForPushNotifications();
        return;
      }
      // Auto sign-in with CEO test account
      await supabase.auth.signInWithPassword({
        email: 'ceo@supercyan.app',
        password: 'testpass123',
      });
      setReady(true);
      await registerForPushNotifications();
    })();
  }, []);

  // Navigate to Email tab when user taps a push notification with email_id
  useEffect(() => {
    if (
      lastNotificationResponse?.notification?.request?.content?.data?.email_id &&
      navigationRef.current
    ) {
      navigationRef.current.navigate('Email');
    }
  }, [lastNotificationResponse]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bgPrimary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={palette.accentPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: palette.bgPrimary }}>
          <TabNavigator />
          <AIFloatingBubble />
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
