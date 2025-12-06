import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface CardProps extends ViewProps {
  elevation?: number;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevation = 2,
  padding = 16,
  style,
  ...props
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding,
      elevation,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};
