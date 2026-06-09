/**
 * SettingsScreen
 * - Display basic settings/info
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import type { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Profile Section */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.userName}>Nhân viên soát vé</Text>
        <Text style={styles.userRole}>CHECKIN_STAFF</Text>
      </View>

      {/* Settings Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin</Text>
        <SettingRow label="Phiên bản" value="1.0.0" />
        <SettingRow label="Device ID" value="device-A" />
        <SettingRow label="Server" value="localhost:3000" />
        <SettingRow label="Concert hiện tại" value="Sky Tour 2026" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dữ liệu</Text>
        <SettingRow label="Offline Queue" value="5 items" />
        <SettingRow label="Cache concert" value="1 concert" />
        <SettingRow label="Sync lần cuối" value="07/06/2026 20:00" />
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 28,
  },
  userName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  userRole: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  section: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },
  settingValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  logoutButton: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xxxl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
