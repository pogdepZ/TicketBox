/**
 * ScannerScreen
 * - Mock camera frame (yellow square)
 * - Concert name display
 * - 4 simulation buttons: Success, Duplicate, Not Found, Wrong Event
 * - Results via navigation to ResultScreen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import type { RootStackParamList, TicketInfo, ScanStatus } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

const MOCK_CONCERT = {
  id: 'concert-001',
  name: '🎵 Sơn Tùng M-TP - Sky Tour 2026',
};

const MOCK_TICKETS: Record<ScanStatus, TicketInfo> = {
  SUCCESS: {
    ticketId: 'ticket-001',
    guestName: 'Nguyễn Văn An',
    ticketType: 'VIP',
    ticketCode: 'TKB-2026-VIP-001',
    concertName: MOCK_CONCERT.name,
    checkedInAt: new Date().toISOString(),
    status: 'SUCCESS',
  },
  DUPLICATE: {
    ticketId: 'ticket-002',
    guestName: 'Trần Thị Bình',
    ticketType: 'SVIP',
    ticketCode: 'TKB-2026-SVIP-002',
    concertName: MOCK_CONCERT.name,
    checkedInAt: new Date().toISOString(),
    status: 'DUPLICATE',
  },
  NOT_FOUND: {
    ticketId: 'ticket-unknown',
    guestName: 'Không xác định',
    ticketType: 'N/A',
    ticketCode: 'INVALID-CODE',
    concertName: MOCK_CONCERT.name,
    checkedInAt: new Date().toISOString(),
    status: 'NOT_FOUND',
  },
  WRONG_EVENT: {
    ticketId: 'ticket-003',
    guestName: 'Lê Hoàng Cường',
    ticketType: 'GA',
    ticketCode: 'TKB-2026-GA-003',
    concertName: 'Concert khác - Không phải sự kiện hiện tại',
    checkedInAt: new Date().toISOString(),
    status: 'WRONG_EVENT',
  },
};

const SCAN_BUTTONS: { status: ScanStatus; label: string; color: string; icon: string }[] = [
  { status: 'SUCCESS', label: 'Scan Hợp lệ', color: COLORS.success, icon: '✅' },
  { status: 'DUPLICATE', label: 'Vé đã Check-in', color: COLORS.warning, icon: '⚠️' },
  { status: 'NOT_FOUND', label: 'Vé không tồn tại', color: COLORS.error, icon: '❌' },
  { status: 'WRONG_EVENT', label: 'Vé sai Concert', color: COLORS.errorDark, icon: '🚫' },
];

export default function ScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isOffline] = useState(false);

  const handleScan = (status: ScanStatus) => {
    const ticket: TicketInfo = {
      ...MOCK_TICKETS[status],
      checkedInAt: new Date().toISOString(),
    };
    navigation.navigate('Result', { ticket, isOffline });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Concert Info */}
      <View style={styles.concertBanner}>
        <Text style={styles.concertLabel}>Concert hiện tại</Text>
        <Text style={styles.concertName}>{MOCK_CONCERT.name}</Text>
      </View>

      {/* Mock Camera Frame */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraFrame}>
          {/* Corner decorations */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          <Text style={styles.cameraText}>📷</Text>
          <Text style={styles.cameraHint}>Camera Preview</Text>
          <Text style={styles.cameraSubHint}>
            (Tuần 1 – Dùng nút bên dưới để giả lập)
          </Text>
        </View>
      </View>

      {/* Scan Simulation Buttons */}
      <View style={styles.buttonsContainer}>
        <Text style={styles.buttonsTitle}>Giả lập kết quả quét mã</Text>
        {SCAN_BUTTONS.map((btn) => (
          <TouchableOpacity
            key={btn.status}
            style={[styles.scanButton, { backgroundColor: btn.color }]}
            onPress={() => handleScan(btn.status)}
            activeOpacity={0.8}
          >
            <Text style={styles.scanButtonIcon}>{btn.icon}</Text>
            <Text style={styles.scanButtonText}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom nav hints */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('OfflineQueue')}
        >
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('SyncHistory')}
        >
          <Text style={styles.navIcon}>🔄</Text>
          <Text style={styles.navLabel}>Sync</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Cài đặt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  concertBanner: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  concertLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  concertName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginTop: 2,
  },
  cameraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  cameraFrame: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: COLORS.warning,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.warningDark,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: BORDER_RADIUS.md,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: BORDER_RADIUS.md,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: BORDER_RADIUS.md,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: BORDER_RADIUS.md,
  },
  cameraText: {
    fontSize: 48,
  },
  cameraHint: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.sm,
  },
  cameraSubHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  buttonsContainer: {
    paddingHorizontal: SPACING.xl,
    flex: 1,
  },
  buttonsTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  scanButtonIcon: {
    fontSize: 18,
    marginRight: SPACING.md,
  },
  scanButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  navButton: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
});
