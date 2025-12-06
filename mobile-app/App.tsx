import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TrackProvider } from './context/TrackContext';
import { ThemeProvider } from './context/ThemeContext';
import { RootStackParamList } from './types/Track';

// Import screens
import HomeScreen from './screens/HomeScreen';
import TrackDetailsScreen from './screens/TrackDetailsScreen';
import CreateEditScreen from './screens/CreateEditScreen';
import SettingsScreen from './screens/SettingsScreen';
import InfoScreen from './screens/about';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ThemeProvider>
      <TrackProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#2563EB',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
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
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen
              name="Info"
              component={InfoScreen}
              options={{ title: 'Information' }}
            />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </TrackProvider>
    </ThemeProvider>
  );
}
