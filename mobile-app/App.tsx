import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { TrackProvider } from './context/TrackContext';
import { ThemeProvider } from './context/ThemeContext';
import { RootNavigator } from './navigation';

export default function App() {
  return (
    <ThemeProvider>
      <TrackProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </TrackProvider>
    </ThemeProvider>
  );
}
