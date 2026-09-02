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
  Home: undefined;
  Settings: undefined;
};

export type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
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
