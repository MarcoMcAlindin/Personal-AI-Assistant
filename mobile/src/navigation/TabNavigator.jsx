// VibeOS Mobile -- Bottom Tab Navigator
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { palette } from '../theme';

import ChatScreen from '../screens/ChatScreen';
import FeedsScreen from '../screens/FeedsScreen';
import EmailScreen from '../screens/EmailScreen';
import HealthScreen from '../screens/HealthScreen';
import PlannerScreen from '../screens/PlannerScreen';

const Tab = createBottomTabNavigator();

const tabIcon = (label) => ({ focused }) => (
  <Text style={{ fontSize: 20, color: focused ? palette.accentPrimary : palette.textMuted }}>
    {label}
  </Text>
);

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: palette.borderColor,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: palette.accentPrimary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarLabelStyle: { fontSize: 10, marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Plan"
        component={PlannerScreen}
        options={{ tabBarIcon: tabIcon('\uD83D\uDCC5') }}
      />
      <Tab.Screen
        name="Feeds"
        component={FeedsScreen}
        options={{ tabBarIcon: tabIcon('\uD83D\uDCF0') }}
      />
      <Tab.Screen
        name="AI"
        component={ChatScreen}
        options={{ tabBarIcon: tabIcon('\uD83D\uDCAC') }}
      />
      <Tab.Screen
        name="Mail"
        component={EmailScreen}
        options={{ tabBarIcon: tabIcon('\u2709\uFE0F') }}
      />
      <Tab.Screen
        name="Health"
        component={HealthScreen}
        options={{ tabBarIcon: tabIcon('\u2764\uFE0F') }}
      />
    </Tab.Navigator>
  );
}
