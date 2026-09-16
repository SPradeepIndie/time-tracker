import React from 'react';
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';

export type IconFamily = 'ionicons' | 'feather' | 'material' | 'fontawesome';

interface AppIconProps {
  name: string;
  family?: IconFamily;
  size?: number;
  color?: string;
  style?: any;
}

/**
 * AppIcon provides a unified, consistent vector icon component across the application,
 * replacing raw unicode emojis with crisp, theme-aware vector graphics.
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  family = 'ionicons',
  size = 20,
  color = '#333',
  style,
}) => {
  switch (family) {
    case 'feather':
      return <Feather name={name as any} size={size} color={color} style={style} />;
    case 'material':
      return (
        <MaterialCommunityIcons name={name as any} size={size} color={color} style={style} />
      );
    case 'fontawesome':
      return <FontAwesome5 name={name as any} size={size} color={color} style={style} />;
    case 'ionicons':
    default:
      return <Ionicons name={name as any} size={size} color={color} style={style} />;
  }
};
