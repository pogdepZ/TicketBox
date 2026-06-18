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
  StyleSheet,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import { Button } from '../components';
import { apiService } from '../services/api';
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

    try {
      const response = await apiService.post<{ accessToken: string; user: any }>('/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      if (response.success && response.data) {
        const { accessToken, user } = response.data;

        // Save to AsyncStorage
        await AsyncStorage.setItem('auth_token', accessToken);
        await AsyncStorage.setItem('auth_user', JSON.stringify(user));
        
        // Set token for future API calls
        apiService.setToken(accessToken);

        navigation.reset({ index: 0, routes: [{ name: 'Scanner' }] });
      } else {
        Alert.alert('Đăng nhập thất bại', response.message || 'Email hoặc mật khẩu không đúng');
      }
    } catch (error) {
      console.error('Login error detailed:', error);
      Alert.alert('Lỗi', 'Không thể kết nối tới server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>TICKETBOX GATE</Text>
            <Text style={styles.shiftText}>Ca tối · Cổng A2</Text>
          </View>
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
        </View>

        <View style={styles.hero}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoMark}>TB</Text>
            </View>
            <View style={styles.eventPill}>
              <Text style={styles.eventPillText}>SKY TOUR 2026</Text>
            </View>
          </View>
          <Text style={styles.logoTitle}>Mở ca check-in</Text>
          <Text style={styles.logoSubtitle}>
            Xác thực nhân viên trước khi quét vé và đồng bộ dữ liệu tại cổng.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Email / Mã nhân viên</Text>
            <TextInput
              style={styles.input}
              placeholder="staff@ticketbox.vn"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhap mat khau"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Button
            title="Bắt đầu ca trực"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: SPACING.lg }}
          />
        </View>

        <View style={styles.shiftPanel}>
          <View style={styles.shiftMetric}>
            <Text style={styles.shiftMetricValue}>A2</Text>
            <Text style={styles.shiftMetricLabel}>Cổng</Text>
          </View>
          <View style={styles.shiftDivider} />
          <View style={styles.shiftMetric}>
            <Text style={styles.shiftMetricValue}>19:00</Text>
            <Text style={styles.shiftMetricLabel}>Mở cửa</Text>
          </View>
          <View style={styles.shiftDivider} />
          <View style={styles.shiftMetric}>
            <Text style={styles.shiftMetricValue}>0</Text>
            <Text style={styles.shiftMetricLabel}>Chưa sync</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
  },
  keyboard: {
    flex: 1,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  shiftText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  hero: {
    marginTop: SPACING.huge,
    marginBottom: SPACING.xxl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  logoMark: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  eventPill: {
    backgroundColor: COLORS.primary + '14',
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  eventPillText: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  logoTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0,
  },
  logoSubtitle: {
    fontSize: FONT_SIZES.lg,
    lineHeight: 24,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    maxWidth: 340,
  },
  form: {
    width: '100%',
    gap: SPACING.md,
  },
  inputBlock: {
    gap: SPACING.xs,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
    fontWeight: '600',
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
  },
  shiftPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: 'auto',
    paddingVertical: SPACING.lg,
  },
  shiftMetric: {
    flex: 1,
    alignItems: 'center',
  },
  shiftMetricValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
  },
  shiftMetricLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  shiftDivider: {
    width: 1,
    height: 34,
    backgroundColor: COLORS.border,
  },
});
