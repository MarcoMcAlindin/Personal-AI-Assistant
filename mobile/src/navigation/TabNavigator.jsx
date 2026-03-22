import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Newspaper, DollarSign, Mail, Cpu } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Text } from '../components/Themed';
import { palette } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import FeedsScreen from '../screens/FeedsScreen';
import MoneyScreen from '../screens/MoneyScreen';
import EmailScreen from '../screens/EmailScreen';
import ChatScreen from '../screens/ChatScreen';

import HealthScreen from '../screens/HealthScreen';
import PlannerScreen from '../screens/PlannerScreen';
import JobsScreen from '../screens/JobsScreen';

const Tab = createBottomTabNavigator();

const TAB_SCREENS = [
  { name: 'Home', component: DashboardScreen, Icon: Home },
  { name: 'News', component: FeedsScreen, Icon: Newspaper },
  { name: 'Money', component: MoneyScreen, Icon: DollarSign },
  { name: 'Email', component: EmailScreen, Icon: Mail },
  { name: 'AI', component: ChatScreen, Icon: Cpu },
];

const HIDDEN_SCREENS = [
  { name: 'Health', component: HealthScreen },
  { name: 'Plan', component: PlannerScreen },
  { name: 'Jobs', component: JobsScreen },
];

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBarContainer}>
      <BlurView intensity={40} tint="dark" style={styles.tabBarBlur}>
        <View style={styles.tabBarInner}>
          {TAB_SCREENS.map((screen, index) => {
            const routeIndex = state.routes.findIndex(r => r.name === screen.name);
            if (routeIndex === -1) return null;
            
            const route = state.routes[routeIndex];
            const isFocused = state.index === routeIndex;
            const Icon = screen.Icon;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={[
                  styles.tabButton,
                  isFocused && styles.tabButtonActive
                ]}
                activeOpacity={0.7}
              >
                <Icon 
                  size={24} 
                  color={isFocused ? palette.accentPrimary : palette.textSecondary}
                  style={isFocused ? styles.activeIcon : null}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: isFocused ? palette.accentPrimary : palette.textSecondary }
                ]}>
                  {screen.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {TAB_SCREENS.map(screen => (
        <Tab.Screen key={screen.name} name={screen.name} component={screen.component} />
      ))}
      {HIDDEN_SCREENS.map(screen => (
        <Tab.Screen key={screen.name} name={screen.name} component={screen.component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabBarBlur: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.2)',
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    paddingHorizontal: 10,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  activeIcon: {
    textShadowColor: 'rgba(0, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  }
});
