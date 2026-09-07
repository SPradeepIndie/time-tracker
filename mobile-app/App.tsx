import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SyncProvider } from './context/SyncContext';
import { TrackProvider } from './context/TrackContext';
import { GoalProvider } from './context/GoalContext';
import { RoutineProvider } from './context/RoutineContext';
import { RootNavigator } from './navigation';
import { bootstrapSystemNotifications } from './services/notifications/notificationService';

function AppContent() {
  const { isDark } = useTheme();

  useEffect(() => {
    // Bootstrap standing system notifications on app launch
    bootstrapSystemNotifications().catch(console.error);
  }, []);

  return (
    <NavigationContainer>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      {/* SyncProvider wraps TrackProvider so TrackContext can read syncEnabled */}
      <SyncProvider>
        <TrackProvider>
          <GoalProvider>
            <RoutineProvider>
              <AppContent />
            </RoutineProvider>
          </GoalProvider>
        </TrackProvider>
      </SyncProvider>
    </ThemeProvider>
  );
}
