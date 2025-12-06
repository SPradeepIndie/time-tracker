import {
  PrimaryColors,
  BackgroundColors,
  TextColors,
  BorderColors,
  PriorityColors,
  TrackStatusColors,
  UIElementColors,
} from '../types';

const primaryColors: PrimaryColors = {
  primary: '#3B82F6',
  primaryDark: '#1E3A8A',
  primaryLight: '#60A5FA',
};

const backgroundColors: BackgroundColors = {
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
};

const textColors: TextColors = {
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textTertiary: '#64748B',
};

const borderColors: BorderColors = {
  border: '#334155',
  divider: '#334155',
};

const priorityColors: PriorityColors = {
  priorityHigh: '#F87171',
  priorityMedium: '#FBBF24',
  priorityLow: '#60A5FA',
};

const trackStatusColors: TrackStatusColors = {
  statusPending: '#64748B',
  statusInProgress: '#FBBF24',
  statusCompleted: '#34D399',
};

const uiElementColors: UIElementColors = {
  overlay: 'rgba(0, 0, 0, 0.7)',
  disabled: '#475569',
  placeholder: '#64748B',
  shadow: '#000000',
};

export const darkPalette = {
  ...primaryColors,
  ...backgroundColors,
  ...textColors,
  ...borderColors,
  ...priorityColors,
  ...trackStatusColors,
  ...uiElementColors,
};
