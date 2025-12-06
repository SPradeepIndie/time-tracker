export * from './types';
export { baseTheme } from './base';
export { lightPalette, darkPalette } from './palette';

import { baseTheme } from './base';
import { lightPalette, darkPalette } from './palette';
import { ThemeColors } from './types';

export const lightTheme: ThemeColors = {
  ...baseTheme,
  ...lightPalette,
};

export const darkTheme: ThemeColors = {
  ...baseTheme,
  ...darkPalette,
};
