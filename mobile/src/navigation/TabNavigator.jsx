// SuperCyan Mobile -- Bottom Tab Navigator
import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme';

import ChatScreen from '../screens/ChatScreen';
import FeedsScreen from '../screens/FeedsScreen';
import EmailScreen from '../screens/EmailScreen';
import HealthScreen from '../screens/HealthScreen';
import PlannerScreen from '../screens/PlannerScreen';

const Tab = createBottomTabNavigator();

const ICON_MAP = {
  Plan:   { inactive: 'calendar-outline',    active: 'calendar'    },
  Feeds:  { inactive: 'newspaper-outline',   active: 'newspaper'   },
  AI:     { inactive: 'chatbubble-outline',  active: 'chatbubble'  },
  Mail:   { inactive: 'mail-outline',        active: 'mail'        },
  Health: { inactive: 'heart-outline',       active: 'heart'       },
};

function tabIcon(tabName) {
  return ({ focused }) => {
    const icons = ICON_MAP[tabName];
    const iconName = focused ? icons.active : icons.inactive;
    const color = focused ? palette.accentPrimary : palette.textMuted;
    return (
      <View style={{ alignItems: 'center' }}>
        <Ionicons name={iconName} size={22} color={color} />
        {focused && (
          <View style={{
            width: 4, height: 4, borderRadius: 2,
            backgroundColor: palette.accentPrimary,
            marginTop: 3,
          }} />
        )}
      </View>
    );
  };
}

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
      <Tab.Screen name="Plan"   component={PlannerScreen} options={{ tabBarIcon: tabIcon('Plan')   }} />
      <Tab.Screen name="Feeds"  component={FeedsScreen}   options={{ tabBarIcon: tabIcon('Feeds')  }} />
      <Tab.Screen name="AI"     component={ChatScreen}    options={{ tabBarIcon: tabIcon('AI')     }} />
      <Tab.Screen name="Mail"   component={EmailScreen}   options={{ tabBarIcon: tabIcon('Mail')   }} />
      <Tab.Screen name="Health" component={HealthScreen}  options={{ tabBarIcon: tabIcon('Health') }} />
    </Tab.Navigator>
  );
}
