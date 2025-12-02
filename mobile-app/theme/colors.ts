export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  
  // Background colors
  background: string;
  surface: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Border colors
  border: string;
  divider: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Priority colors
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  
  // Status colors for tracks
  statusPending: string;
  statusInProgress: string;
  statusCompleted: string;
  
  // UI elements
  shadow: string;
  overlay: string;
  disabled: string;
  placeholder: string;
}

export const lightTheme: ThemeColors = {
  // Primary - Modern blue shades
  primary: '#2563EB',        // Vibrant blue
  primaryDark: '#1E40AF',    // Darker blue
  primaryLight: '#60A5FA',   // Light blue
  
  // Backgrounds
  background: '#F8FAFC',     // Very light gray-blue
  surface: '#FFFFFF',        // Pure white
  card: '#FFFFFF',           // Pure white
  
  // Text
  text: '#0F172A',           // Very dark blue-gray
  textSecondary: '#475569',  // Medium gray
  textTertiary: '#94A3B8',   // Light gray
  
  // Borders
  border: '#E2E8F0',         // Light gray-blue
  divider: '#E2E8F0',        // Light gray-blue
  
  // Status
  success: '#10B981',        // Green
  warning: '#F59E0B',        // Orange
  error: '#EF4444',          // Red
  info: '#3B82F6',           // Blue
  
  // Priority
  priorityHigh: '#EF4444',   // Red
  priorityMedium: '#F59E0B', // Orange
  priorityLow: '#3B82F6',    // Blue
  
  // Track status
  statusPending: '#94A3B8',      // Gray
  statusInProgress: '#F59E0B',   // Orange
  statusCompleted: '#10B981',    // Green
  
  // UI elements
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  disabled: '#CBD5E1',
  placeholder: '#94A3B8',
};

export const darkTheme: ThemeColors = {
  // Primary - Modern blue shades
  primary: '#3B82F6',        // Bright blue
  primaryDark: '#1E3A8A',    // Deep blue
  primaryLight: '#60A5FA',   // Light blue
  
  // Backgrounds
  background: '#0F172A',     // Very dark blue-gray
  surface: '#1E293B',        // Dark blue-gray
  card: '#1E293B',           // Dark blue-gray
  
  // Text
  text: '#F1F5F9',           // Very light gray
  textSecondary: '#CBD5E1',  // Light gray
  textTertiary: '#64748B',   // Medium gray
  
  // Borders
  border: '#334155',         // Dark gray-blue
  divider: '#334155',        // Dark gray-blue
  
  // Status
  success: '#10B981',        // Green
  warning: '#F59E0B',        // Orange
  error: '#EF4444',          // Red
  info: '#3B82F6',           // Blue
  
  // Priority
  priorityHigh: '#F87171',   // Light red
  priorityMedium: '#FBBF24', // Light orange
  priorityLow: '#60A5FA',    // Light blue
  
  // Track status
  statusPending: '#64748B',      // Gray
  statusInProgress: '#FBBF24',   // Light orange
  statusCompleted: '#34D399',    // Light green
  
  // UI elements
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
  disabled: '#475569',
  placeholder: '#64748B',
};

export type Theme = 'light' | 'dark';
