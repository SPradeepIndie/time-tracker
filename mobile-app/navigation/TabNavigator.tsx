import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { AppIcon } from '../components/ui/AppIcon';
import HomeScreen from '../screens/home/HomeScreen';
import GoalsScreen from '../screens/goals/GoalsScreen';
import RoutinesScreen from '../screens/routines/RoutinesScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = insets.bottom;
  const paddingBottom = Math.max(bottomInset, 8);
  const tabHeight = 58 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => (
          <PlatformPressable
            {...props}
            android_ripple={{
              borderless: true,
              radius: 20,
              color: colors.primary + '25',
            }}
          />
        ),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom,
          height: tabHeight,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Tasks"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name={focused ? 'checkbox' : 'checkbox-outline'} size={22} color={color} />
          ),
          tabBarLabel: 'Tasks',
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name={focused ? 'flag' : 'flag-outline'} size={22} color={color} />
          ),
          tabBarLabel: 'Goals',
        }}
      />
      <Tab.Screen
        name="Routines"
        component={RoutinesScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name="repeat" size={22} color={color} />
          ),
          tabBarLabel: 'Routines',
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          ),
          tabBarLabel: 'Analytics',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          ),
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};
