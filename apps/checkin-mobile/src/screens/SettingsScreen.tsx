/**
 * SettingsScreen
 * - Display basic settings/info
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import { Button } from '../components';
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

  const debugStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const result = await AsyncStorage.multiGet(keys);
      console.log('--- ASYNC STORAGE DUMP ---');
      result.forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });
      console.log('--------------------------');
      Alert.alert('Log thành công', 'Mở Terminal/Console của Expo để xem chi tiết dữ liệu nhé!');
    } catch (error) {
      console.error('Error reading AsyncStorage:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>NV</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>Nhân viên soát vé</Text>
            <Text style={styles.userRole}>Đang trực cổng check-in</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>A2</Text>
          </View>
        </View>

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

        <View style={{ marginTop: SPACING.xxxl }}>
          <Button
            title="📥 Tải dữ liệu Offline (Snapshot)"
            onPress={() => navigation.navigate('Snapshot')}
            variant="primary"
            style={{ marginBottom: SPACING.md }}
          />
          <Button
            title="🔍 In dữ liệu lưu trữ (Console)"
            onPress={debugStorage}
            variant="secondary"
            style={{ marginBottom: SPACING.md }}
          />
          <Button
            title="Đăng xuất"
            onPress={handleLogout}
            variant="ghost"
            style={{ borderWidth: 1, borderColor: COLORS.error }}
            textStyle={{ color: COLORS.error }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  avatarText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '900',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  userRole: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  profileBadge: {
    width: 42,
    height: 34,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadgeText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
  },
  section: {
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
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
});
