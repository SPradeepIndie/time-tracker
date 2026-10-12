/**
 * navigationRef.ts
 *
 * Dedicated leaf module for the global navigation container reference.
 * Isolates navigationRef from navigators and screens to prevent require cycles.
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
