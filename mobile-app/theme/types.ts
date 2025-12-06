export interface PrimaryColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
}

export interface BackgroundColors {
  background: string;
  surface: string;
  card: string;
}

export interface TextColors {
  text: string;
  textSecondary: string;
  textTertiary: string;
}

export interface BorderColors {
  border: string;
  divider: string;
}

export interface StatusColors {
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface PriorityColors {
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
}

export interface TrackStatusColors {
  statusPending: string;
  statusInProgress: string;
  statusCompleted: string;
}

export interface UIElementColors {
  shadow: string;
  overlay: string;
  disabled: string;
  placeholder: string;
}

export interface ThemeColors 
  extends PrimaryColors,
          BackgroundColors,
          TextColors,
          BorderColors,
          StatusColors,
          PriorityColors,
          TrackStatusColors,
          UIElementColors {}

export type Theme = 'light' | 'dark';
