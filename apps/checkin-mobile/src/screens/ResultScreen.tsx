/**
 * ResultScreen
 * - Display ticket details: Guest name, Ticket type, Code, Check-in time
 * - "Quét tiếp" button → back to Scanner
 * - Offline badge when not connected
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import type { RootStackParamList, ScanStatus } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Result'>;
type ResultRouteProp = RouteProp<RootStackParamList, 'Result'>;

const STATUS_CONFIG: Record<
  ScanStatus,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  SUCCESS: {
    label: 'Check-in thành công',
    icon: '✅',
    color: COLORS.success,
    bgColor: '#00B89420',
  },
  DUPLICATE: {
    label: 'Vé đã được check-in',
    icon: '⚠️',
    color: COLORS.warning,
    bgColor: '#FDCB6E20',
  },
  NOT_FOUND: {
    label: 'Vé không tồn tại',
    icon: '❌',
    color: COLORS.error,
    bgColor: '#E74C3C20',
  },
  WRONG_EVENT: {
    label: 'Vé sai sự kiện',
    icon: '🚫',
    color: COLORS.errorDark,
    bgColor: '#C0392B20',
  },
};

export default function ResultScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResultRouteProp>();
  const { ticket, isOffline } = route.params;

  const config = STATUS_CONFIG[ticket.status];
  const checkinTime = new Date(ticket.checkedInAt).toLocaleString('vi-VN');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Offline Badge */}
      {isOffline && (
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineDot}>🔴</Text>
          <Text style={styles.offlineText}>Offline – sẽ tự động sync</Text>
        </View>
      )}

      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: config.bgColor }]}>
        <Text style={styles.statusIcon}>{config.icon}</Text>
        <Text style={[styles.statusLabel, { color: config.color }]}>
          {config.label}
        </Text>
      </View>

      {/* Ticket Details */}
      <View style={styles.detailsCard}>
        <DetailRow label="Tên khách" value={ticket.guestName} />
        <DetailRow label="Loại vé" value={ticket.ticketType} highlight />
        <DetailRow label="Mã vé" value={ticket.ticketCode} mono />
        <DetailRow label="Concert" value={ticket.concertName} />
        <DetailRow label="Thời gian check-in" value={checkinTime} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.scanAgainButton}
          onPress={() => navigation.navigate('Scanner')}
          activeOpacity={0.8}
        >
          <Text style={styles.scanAgainIcon}>📷</Text>
          <Text style={styles.scanAgainText}>Quét tiếp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.queueButton}
          onPress={() => navigation.navigate('OfflineQueue')}
          activeOpacity={0.8}
        >
          <Text style={styles.queueButtonText}>Xem Offline Queue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          highlight && styles.detailHighlight,
          mono && styles.detailMono,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.errorDark + '30',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.lg,
  },
  offlineDot: {
    fontSize: 10,
    marginRight: SPACING.xs,
  },
  offlineText: {
    color: COLORS.errorLight,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  statusBanner: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.xl,
  },
  statusIcon: {
    fontSize: 56,
  },
  statusLabel: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    flex: 1.5,
    textAlign: 'right',
  },
  detailHighlight: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  detailMono: {
    fontFamily: 'monospace',
    fontSize: FONT_SIZES.sm,
    color: COLORS.info,
  },
  actions: {
    marginTop: SPACING.xxl,
    gap: SPACING.md,
  },
  scanAgainButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAgainIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  scanAgainText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  queueButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  queueButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },
});
