/**
 * AuthScreen.tsx
 *
 * Shown on every app launch when a PIN is set.
 * Biometric is attempted automatically first; fallback is the 4-digit PIN pad.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/Track';
import { useTheme } from '../../context/ThemeContext';
import {
  hashPinWithSalt,
  generatePinSalt,
  PIN_HASH_KEY,
  PIN_SALT_KEY,
} from '../../services/storage/encryption';

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Auth'>;
};

export default function AuthScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Lockout countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (lockoutRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setLockoutRemaining((prev) => prev - 1);
      }, 1000);
    } else if (lockoutRemaining === 0 && failedAttempts >= MAX_ATTEMPTS) {
      setFailedAttempts(0);
      setError('');
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lockoutRemaining, failedAttempts]);

  // ── Biometric on mount ────────────────────────────────────────────────────
  useEffect(() => {
    checkBiometricAndPrompt();
  }, []);

  const checkBiometricAndPrompt = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      setBiometricAvailable(true);
      promptBiometric();
    }
  }, []);

  const promptBiometric = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Time Tracker',
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
    });
    if (result.success) {
      navigation.replace('MainTabs');
    }
  }, [navigation]);

  // ── PIN pad logic ─────────────────────────────────────────────────────────
  const handleKey = useCallback(async (key: string) => {
    if (lockoutRemaining > 0) {
      Vibration.vibrate(100);
      return;
    }

    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      setError('');
      return;
    }

    const next = pin + key;
    setPin(next);

    if (next.length === PIN_LENGTH) {
      const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
      const storedSalt = await SecureStore.getItemAsync(PIN_SALT_KEY);

      let isMatch = false;

      if (storedSalt) {
        const enteredHash = await hashPinWithSalt(next, storedSalt);
        isMatch = enteredHash === storedHash;
      } else {
        // Legacy migration check: verify old unsalted SHA-256 hash
        const legacyHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          next
        );
        if (legacyHash === storedHash) {
          isMatch = true;
          // Auto-upgrade to salted stretched PIN hash
          try {
            const newSalt = await generatePinSalt();
            const newHash = await hashPinWithSalt(next, newSalt);
            await SecureStore.setItemAsync(PIN_SALT_KEY, newSalt, {
              keychainAccessible: SecureStore.WHEN_UNLOCKED,
            });
            await SecureStore.setItemAsync(PIN_HASH_KEY, newHash, {
              keychainAccessible: SecureStore.WHEN_UNLOCKED,
            });
          } catch (e) {
            console.warn('[auth] Could not auto-upgrade legacy PIN hash:', e);
          }
        }
      }

      if (isMatch) {
        setFailedAttempts(0);
        setError('');
        navigation.replace('MainTabs');
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        Vibration.vibrate(300);

        if (nextAttempts >= MAX_ATTEMPTS) {
          setLockoutRemaining(LOCKOUT_SECONDS);
          setError(`Too many failed attempts. Locked for ${LOCKOUT_SECONDS}s.`);
        } else {
          const left = MAX_ATTEMPTS - nextAttempts;
          setError(`Incorrect PIN. ${left} attempt${left === 1 ? '' : 's'} remaining.`);
        }
        setTimeout(() => setPin(''), 400);
      }
    }
  }, [pin, navigation, lockoutRemaining, failedAttempts]);

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      <Text style={s.appName}>Time Tracker</Text>
      <Text style={s.subtitle}>Enter your PIN to continue</Text>

      {/* Dot indicators */}
      <View style={s.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[s.dot, i < pin.length && s.dotFilled]}
          />
        ))}
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {/* Keypad */}
      <View style={s.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => (
          <TouchableOpacity
            key={k}
            style={[s.key, (k === '' || lockoutRemaining > 0) && s.keyEmpty]}
            onPress={() => k !== '' && handleKey(k)}
            disabled={k === '' || lockoutRemaining > 0}
            activeOpacity={0.6}
          >
            <Text style={s.keyText}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Biometric fallback button */}
      {biometricAvailable && (
        <TouchableOpacity style={s.biometricBtn} onPress={promptBiometric}>
          <Text style={s.biometricText}>🔑  Use Biometric</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    appName: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 40,
    },
    dots: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 12,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: 'transparent',
    },
    dotFilled: {
      backgroundColor: colors.primary,
    },
    error: {
      fontSize: 13,
      color: colors.priorityHigh,
      marginBottom: 8,
      minHeight: 20,
    },
    keypad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 280,
      gap: 12,
      marginTop: 24,
      justifyContent: 'center',
    },
    key: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    },
    keyEmpty: {
      backgroundColor: 'transparent',
      elevation: 0,
      shadowOpacity: 0,
    },
    keyText: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.text,
    },
    biometricBtn: {
      marginTop: 32,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    biometricText: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: '500',
    },
  });
}
