import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ScreenContainerProps extends ViewProps {
  withPadding?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  withPadding = true,
  style,
  ...props
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: withPadding ? 16 : 0,
    },
  });

  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );
};
