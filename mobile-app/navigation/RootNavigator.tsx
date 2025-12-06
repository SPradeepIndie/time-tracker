import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { TabNavigator } from './TabNavigator';
import TrackDetailsScreen from '../screens/details/TrackDetailsScreen';
import CreateEditScreen from '../screens/create-edit/CreateEditScreen';
import InfoScreen from '../screens/about';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
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
