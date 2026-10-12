import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SyncProvider } from './context/SyncContext';
import { TrackProvider } from './context/TrackContext';
import { GoalProvider } from './context/GoalContext';
import { RoutineProvider } from './context/RoutineContext';
import { ListProvider } from './context/ListContext';
import { BlastProvider } from './context/BlastContext';
import { BlastActiveBanner } from './components/ui/BlastActiveBanner';
import { RootNavigator, navigationRef } from './navigation';
import { bootstrapSystemNotifications } from './services/notifications/notificationService';

function AppContent() {
  const { isDark } = useTheme();
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>();

  useEffect(() => {
    // Bootstrap standing system notifications on app launch
    bootstrapSystemNotifications().catch(console.error);
  }, []);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        setCurrentRouteName(navigationRef.getCurrentRoute()?.name);
      }}
      onStateChange={() => {
        const route = navigationRef.getCurrentRoute();
        setCurrentRouteName(route?.name);
      }}
    >
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <BlastActiveBanner currentRouteName={currentRouteName} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {/* SyncProvider wraps TrackProvider so TrackContext can read syncEnabled */}
        <SyncProvider>
          <TrackProvider>
            <GoalProvider>
              <RoutineProvider>
                <ListProvider>
                  <BlastProvider>
                    <AppContent />
                  </BlastProvider>
                </ListProvider>
              </RoutineProvider>
            </GoalProvider>
          </TrackProvider>
        </SyncProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
