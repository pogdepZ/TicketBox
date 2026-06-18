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
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import { Button, Card } from '../components';
import type { RootStackParamList, ScanStatus } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Result'>;
type ResultRouteProp = RouteProp<RootStackParamList, 'Result'>;

const STATUS_CONFIG: Record<
  ScanStatus,
  { label: string; code: string; color: string; bgColor: string }
> = {
  SUCCESS: {
    label: 'Check-in thành công',
    code: 'OK',
    color: COLORS.success,
    bgColor: '#16C78418',
  },
  DUPLICATE: {
    label: 'Vé đã được check-in',
    code: '2X',
    color: COLORS.warning,
    bgColor: '#F8B84E18',
  },
  NOT_FOUND: {
    label: 'Vé không tồn tại',
    code: 'NO',
    color: COLORS.error,
    bgColor: '#FF4D5E18',
  },
  WRONG_EVENT: {
    label: 'Vé sai sự kiện',
    code: 'EV',
    color: COLORS.errorDark,
    bgColor: '#C8283A18',
  },
};

export default function ResultScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResultRouteProp>();
  const { ticket, isOffline } = route.params;

  console.log("ticket", ticket)

  const config = STATUS_CONFIG[ticket.status as ScanStatus] || {
    label: `Lỗi: Status là "${ticket.status}"`,
    code: 'ERR',
    color: COLORS.error,
    bgColor: '#CCCCCC30', 
  };
  const checkinTime = new Date(ticket.checkedInAt).toLocaleString('vi-VN');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isOffline && (
          <View style={styles.offlineBadge}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>Offline - sẽ tự động sync</Text>
          </View>
        )}

        <View style={[styles.statusBanner, { backgroundColor: config.bgColor }]}>
          <View style={styles.statusTop}>
            <View style={[styles.statusIcon, { backgroundColor: config.color }]}>
              <Text style={styles.statusIconText}>{config.code}</Text>
            </View>
            <View style={styles.statusCopy}>
              <Text style={[styles.statusLabel, { color: config.color }]}>
                {config.label}
              </Text>
              <Text style={styles.statusHint}>
                {ticket.status === 'SUCCESS'
                  ? 'Cho khách vào cổng'
                  : 'Giữ khách tại quầy hỗ trợ'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ticketHeader}>
          <Text style={styles.ticketName}>{ticket.guestName}</Text>
          <View style={styles.ticketTypeBadge}>
            <Text style={styles.ticketTypeText}>{ticket.ticketType}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow label="Mã vé" value={ticket.ticketCode} mono />
          <DetailRow label="Concert" value={ticket.concertName} />
          <DetailRow label="Thời gian check-in" value={checkinTime} />
        </View>

        <View style={styles.actions}>
          <Button
            title="Quét vé tiếp theo"
            onPress={() => navigation.navigate('Scanner')}
            variant="primary"
          />

          <Button
            title="Xem hàng đợi offline"
            onPress={() => navigation.navigate('OfflineQueue')}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    marginRight: SPACING.xs,
  },
  offlineText: {
    color: COLORS.errorLight,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  statusBanner: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  statusIconText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
  },
  statusLabel: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
  },
  statusHint: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.sm,
  },
  statusCopy: {
    flex: 1,
  },
  ticketHeader: {
    marginTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ticketName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.title,
    fontWeight: '900',
  },
  ticketTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.info + '16',
    borderWidth: 1,
    borderColor: COLORS.info + '55',
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.md,
  },
  ticketTypeText: {
    color: COLORS.info,
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
  },
  detailsCard: {
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xl,
  },
  detailRow: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
    lineHeight: 24,
  },
  detailHighlight: {
    color: COLORS.info,
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
});
