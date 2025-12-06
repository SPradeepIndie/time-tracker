import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

interface SafeAreaViewProps extends ViewProps {
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export const SafeAreaView: React.FC<SafeAreaViewProps> = ({
  children,
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  ...props
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  return (
    <RNSafeAreaView style={[styles.container, style]} edges={edges} {...props}>
      {children}
    </RNSafeAreaView>
  );
};
