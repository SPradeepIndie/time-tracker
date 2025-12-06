import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  title: string;
  leftAction?: {
    icon: string;
    onPress: () => void;
  };
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
  rightActions?: Array<{
    icon: string;
    onPress: () => void;
  }>;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  leftAction,
  rightAction,
  rightActions,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 20,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
    },
    leftAction: {
      padding: 8,
      marginRight: 12,
    },
    rightActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
    },
    actionIcon: {
      fontSize: 24,
    },
  });

  return (
    <View style={styles.header}>
      {leftAction && (
        <TouchableOpacity style={styles.leftAction} onPress={leftAction.onPress}>
          <Text style={styles.actionIcon}>{leftAction.icon}</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
      {(rightAction || rightActions) && (
        <View style={styles.rightActions}>
          {rightAction && (
            <TouchableOpacity style={styles.actionButton} onPress={rightAction.onPress}>
              <Text style={styles.actionIcon}>{rightAction.icon}</Text>
            </TouchableOpacity>
          )}
          {rightActions?.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={action.onPress}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};
