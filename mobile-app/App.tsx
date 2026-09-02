import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SyncProvider } from './context/SyncContext';
import { TrackProvider } from './context/TrackContext';
import { RootNavigator } from './navigation';

function AppContent() {
  const { isDark } = useTheme();
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
          <AppContent />
        </TrackProvider>
      </SyncProvider>
    </ThemeProvider>
  );
}
