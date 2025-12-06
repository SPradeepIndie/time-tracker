import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  disabled,
  style,
  ...props
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      paddingVertical: size === 'small' ? 8 : size === 'medium' ? 12 : 16,
      paddingHorizontal: size === 'small' ? 12 : size === 'medium' ? 16 : 24,
      backgroundColor:
        variant === 'primary'
          ? colors.primary
          : variant === 'danger'
          ? colors.error
          : variant === 'secondary'
          ? colors.surface
          : 'transparent',
      borderWidth: variant === 'secondary' || variant === 'ghost' ? 1 : 0,
      borderColor: variant === 'secondary' ? colors.border : variant === 'ghost' ? colors.primary : 'transparent',
      opacity: disabled || loading ? 0.6 : 1,
    },
    text: {
      fontSize: size === 'small' ? 14 : size === 'medium' ? 16 : 18,
      fontWeight: '600',
      color:
        variant === 'primary' || variant === 'danger'
          ? '#FFFFFF'
          : variant === 'ghost'
          ? colors.primary
          : colors.text,
    },
    icon: {
      marginRight: 8,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.primary}
        />
      ) : (
        <>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={styles.text}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};
