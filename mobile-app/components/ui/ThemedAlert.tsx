/**
 * ThemedAlert.tsx
 *
 * Custom in-app alert and confirmation dialog.
 * Replaces default OS native Alert.alert() with a dialog fully styled
 * according to the app's dark/light theme, typography, and vector icons.
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { AppIcon } from './AppIcon';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  buttons?: AlertButton[];
  onClose?: () => void;
  onDismiss?: () => void;
}

export const ThemedAlert: React.FC<ThemedAlertProps> = ({
  visible,
  title,
  message,
  icon,
  iconColor,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
  onDismiss,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  const handleClose = onClose || onDismiss || (() => {});
  const s = makeStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.dialogCard}>
              {icon && (
                <View style={[s.iconBox, { backgroundColor: (iconColor || colors.primary) + '18' }]}>
                  <AppIcon name={icon} size={28} color={iconColor || colors.primary} />
                </View>
              )}

              <Text style={s.title}>{title}</Text>
              {!!message && <Text style={s.message}>{message}</Text>}

              <View style={s.buttonRow}>
                {buttons.map((btn, idx) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        s.button,
                        isCancel && s.buttonCancel,
                        isDestructive && s.buttonDestructive,
                        !isCancel && !isDestructive && s.buttonPrimary,
                      ]}
                      onPress={() => {
                        if (btn.onPress) {
                          btn.onPress();
                        } else {
                          handleClose();
                        }
                      }}
                    >
                      <Text
                        style={[
                          s.buttonText,
                          isCancel && s.buttonTextCancel,
                          isDestructive && s.buttonTextDestructive,
                          !isCancel && !isDestructive && s.buttonTextPrimary,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      zIndex: 999,
    },
    dialogCard: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
      marginTop: 4,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonCancel: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonDestructive: {
      backgroundColor: (colors.error || '#EF4444') + '18',
      borderWidth: 1,
      borderColor: colors.error || '#EF4444',
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '700',
    },
    buttonTextPrimary: {
      color: '#FFFFFF',
    },
    buttonTextCancel: {
      color: colors.textSecondary,
    },
    buttonTextDestructive: {
      color: colors.error || '#EF4444',
    },
  });
}
