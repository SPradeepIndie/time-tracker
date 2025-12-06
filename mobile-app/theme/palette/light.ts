import {
  PrimaryColors,
  BackgroundColors,
  TextColors,
  BorderColors,
  TrackStatusColors,
  UIElementColors,
} from '../types';

const primaryColors: PrimaryColors = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  primaryLight: '#60A5FA',
};

const backgroundColors: BackgroundColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
};

const textColors: TextColors = {
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
};

const borderColors: BorderColors = {
  border: '#E2E8F0',
  divider: '#E2E8F0',
};

const trackStatusColors: TrackStatusColors = {
  statusPending: '#94A3B8',
  statusInProgress: '#F59E0B',
  statusCompleted: '#10B981',
};

const uiElementColors: UIElementColors = {
  overlay: 'rgba(0, 0, 0, 0.5)',
  disabled: '#CBD5E1',
  placeholder: '#94A3B8',
  shadow: '#000000',
};

export const lightPalette = {
  ...primaryColors,
  ...backgroundColors,
  ...textColors,
  ...borderColors,
  ...trackStatusColors,
  ...uiElementColors,
};
