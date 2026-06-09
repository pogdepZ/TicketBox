/**
 * LoginScreen
 * - Input Email/Mã NV + Password
 * - Fake JWT → AsyncStorage
 * - Network status badge (Online/Offline)
 * - Role mặc định: CHECKIN_STAFF
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import type { RootStackParamList } from '../types';

// Simulated network check
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    // In production, use @react-native-community/netinfo
    // For mock, we toggle based on a timer or keep online
    setIsOnline(true);
  }, []);
  return isOnline;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const MOCK_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdGFmZi0wMDEiLCJyb2xlIjoiQ0hFQ0tJTl9TVEFGRiIsImlhdCI6MTcwMDAwMDAwMH0.mock-signature';

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isOnline = useNetworkStatus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Save mock JWT token
    await AsyncStorage.setItem('auth_token', MOCK_JWT);
    await AsyncStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'staff-001',
        email: email.trim(),
        fullName: 'Nhân viên soát vé',
        role: 'CHECKIN_STAFF',
        token: MOCK_JWT,
      }),
    );

    setLoading(false);
    navigation.reset({ index: 0, routes: [{ name: 'Scanner' }] });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Network Status Badge */}
      <View style={styles.networkBadge}>
        <View
          style={[
            styles.networkDot,
            { backgroundColor: isOnline ? COLORS.online : COLORS.offline },
          ]}
        />
        <Text style={styles.networkText}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoEmoji}>🎫</Text>
        </View>
        <Text style={styles.logoTitle}>TicketBox</Text>
        <Text style={styles.logoSubtitle}>Check-in Staff Portal</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.inputLabel}>Email / Mã nhân viên</Text>
        <TextInput
          style={styles.input}
          placeholder="staff@ticketbox.vn"
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Mật khẩu</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={COLORS.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.roleHint}>
          Role mặc định: CHECKIN_STAFF
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'center',
  },
  networkBadge: {
    position: 'absolute',
    top: 50,
    right: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  networkText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.huge,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoEmoji: {
    fontSize: 36,
  },
  logoTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
  },
  logoSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  form: {
    width: '100%',
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  roleHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
