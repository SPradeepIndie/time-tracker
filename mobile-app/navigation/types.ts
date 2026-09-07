import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  PinSetup: undefined;
  MainTabs: undefined;
  TrackDetails: { id: string };
  CreateEdit: { id?: string };
  Info: undefined;
};

export type MainTabParamList = {
  Tasks: undefined;
  Goals: undefined;
  Routines: undefined;
  Analytics: undefined;
  Settings: undefined;
};

// ── Composite nav prop types ────────────────────────────────────────────────

export type TasksScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Tasks'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type HomeScreenNavigationProp = TasksScreenNavigationProp; // backward compat alias

export type GoalsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Goals'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type RoutinesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Routines'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type AnalyticsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Analytics'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type SettingsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Settings'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type TrackDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TrackDetails'
>;

export type TrackDetailsScreenRouteProp = RouteProp<RootStackParamList, 'TrackDetails'>;

export type CreateEditScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CreateEdit'
>;

export type CreateEditScreenRouteProp = RouteProp<RootStackParamList, 'CreateEdit'>;
