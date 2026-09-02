/**
 * PinSetupScreen.tsx
 *
 * Shown only on first launch (no PIN set yet).
 * User enters a 4-digit PIN twice to confirm, then it's stored as a SHA-256 hash
 * in expo-secure-store (hardware-backed; never stored as plaintext).
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/Track';
import { useTheme } from '../../context/ThemeContext';

const PIN_HASH_KEY = 'app_pin_hash';
const PIN_LENGTH = 4;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PinSetup'>;
};

type Step = 'create' | 'confirm';

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export default function PinSetupScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('create');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const s = makeStyles(colors);

  const handleKey = useCallback(async (key: string) => {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      setError('');
      return;
    }

    const next = pin + key;
    setPin(next);

    if (next.length < PIN_LENGTH) return;

    if (step === 'create') {
      setFirstPin(next);
      setPin('');
      setStep('confirm');
      return;
    }

    // Confirm step
    if (next === firstPin) {
      const hash = await hashPin(next);
      await SecureStore.setItemAsync(PIN_HASH_KEY, hash, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
      navigation.replace('MainTabs');
    } else {
      Vibration.vibrate(300);
      setError('PINs do not match. Start again.');
      setTimeout(() => {
        setPin('');
        setFirstPin('');
        setStep('create');
        setError('');
      }, 800);
    }
  }, [pin, step, firstPin, navigation]);

  return (
    <View style={s.container}>
      <Text style={s.appName}>Time Tracker</Text>
      <Text style={s.title}>
        {step === 'create' ? 'Create a PIN' : 'Confirm your PIN'}
      </Text>
      <Text style={s.subtitle}>
        {step === 'create'
          ? 'Choose a 4-digit PIN to secure your data'
          : 'Enter your PIN again to confirm'}
      </Text>

      <View style={s.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
        ))}
      </View>

      {error ? <Text style={s.error}>{error}</Text> : <Text style={s.error} />}

      <View style={s.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => (
          <TouchableOpacity
            key={k}
            style={[s.key, k === '' && s.keyEmpty]}
            onPress={() => k !== '' && handleKey(k)}
            disabled={k === ''}
            activeOpacity={0.6}
          >
            <Text style={s.keyText}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.steps}>
        <View style={[s.stepDot, step === 'create' && s.stepDotActive]} />
        <View style={[s.stepDot, step === 'confirm' && s.stepDotActive]} />
      </View>
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
      marginBottom: 4,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 36,
    },
    dots: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 8,
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
      minHeight: 20,
      marginBottom: 8,
    },
    keypad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 280,
      gap: 12,
      marginTop: 16,
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
    steps: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 32,
    },
    stepDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    stepDotActive: {
      backgroundColor: colors.primary,
      width: 20,
    },
  });
}
