/**
 * RootNavigator.tsx
 *
 * Root stack: Auth gate → PinSetup (first launch) → MainTabs → detail screens.
 * On every cold start, checks whether a PIN is already set (secure-store)
 * and routes to AuthScreen or PinSetupScreen accordingly.
 */
import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { RootStackParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { TabNavigator } from './TabNavigator';
import TrackDetailsScreen from '../screens/details/TrackDetailsScreen';
import CreateEditScreen from '../screens/create-edit/CreateEditScreen';
import InfoScreen from '../screens/about';
import AuthScreen from '../screens/auth/AuthScreen';
import PinSetupScreen from '../screens/auth/PinSetupScreen';

const PIN_HASH_KEY = 'app_pin_hash';
const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { colors } = useTheme();
  const [initialRoute, setInitialRoute] = useState<
    'Auth' | 'PinSetup' | 'MainTabs' | null
  >(null);

  useEffect(() => {
    (async () => {
      const pinHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
      setInitialRoute(pinHash ? 'Auth' : 'PinSetup');
    })();
  }, []);

  if (!initialRoute) return null; // Splash / loading — keep screen blank briefly

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {/* Auth gate — no header */}
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PinSetup"
        component={PinSetupScreen}
        options={{ headerShown: false }}
      />

      {/* Main app */}
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TrackDetails"
        component={TrackDetailsScreen}
        options={{ title: 'Track Details' }}
      />
      <Stack.Screen
        name="CreateEdit"
        component={CreateEditScreen}
        options={{ title: 'Track' }}
      />
      <Stack.Screen
        name="Info"
        component={InfoScreen}
        options={{ title: 'Information' }}
      />
    </Stack.Navigator>
  );
};
