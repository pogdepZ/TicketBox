/**
 * SyncHistoryScreen
 * - Display sync history with server (5-10 mock records)
 * - Shows: sync time, record count, status (Success/Failed)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import type { SyncHistoryRecord } from '../types';

const MOCK_HISTORY: SyncHistoryRecord[] = [
  {
    id: 'sync-001',
    syncedAt: '2026-06-07T20:00:00.000Z',
    recordCount: 12,
    status: 'SUCCESS',
  },
  {
    id: 'sync-002',
    syncedAt: '2026-06-07T19:45:00.000Z',
    recordCount: 5,
    status: 'SUCCESS',
  },
  {
    id: 'sync-003',
    syncedAt: '2026-06-07T19:30:00.000Z',
    recordCount: 8,
    status: 'FAILED',
    errorMessage: 'Server timeout – retry sau 30s',
  },
  {
    id: 'sync-004',
    syncedAt: '2026-06-07T19:15:00.000Z',
    recordCount: 3,
    status: 'SUCCESS',
  },
  {
    id: 'sync-005',
    syncedAt: '2026-06-07T19:00:00.000Z',
    recordCount: 15,
    status: 'SUCCESS',
  },
  {
    id: 'sync-006',
    syncedAt: '2026-06-07T18:45:00.000Z',
    recordCount: 2,
    status: 'PARTIAL',
    errorMessage: '1 bản ghi bị conflict (duplicate ticket)',
  },
  {
    id: 'sync-007',
    syncedAt: '2026-06-07T18:30:00.000Z',
    recordCount: 20,
    status: 'SUCCESS',
  },
  {
    id: 'sync-008',
    syncedAt: '2026-06-07T18:15:00.000Z',
    recordCount: 7,
    status: 'FAILED',
    errorMessage: 'Mất kết nối mạng',
  },
  {
    id: 'sync-009',
    syncedAt: '2026-06-07T18:00:00.000Z',
    recordCount: 10,
    status: 'SUCCESS',
  },
  {
    id: 'sync-010',
    syncedAt: '2026-06-07T17:45:00.000Z',
    recordCount: 4,
    status: 'SUCCESS',
  },
];

const STATUS_CONFIG: Record<string, { code: string; color: string; label: string }> = {
  SUCCESS: { code: 'OK', color: COLORS.success, label: 'Thành công' },
  FAILED: { code: 'NO', color: COLORS.error, label: 'Thất bại' },
  PARTIAL: { code: 'PART', color: COLORS.warning, label: 'Một phần' },
};

export default function SyncHistoryScreen() {
  const totalSynced = MOCK_HISTORY.filter((r) => r.status === 'SUCCESS').reduce(
    (sum, r) => sum + r.recordCount,
    0,
  );

  const renderItem = ({ item }: { item: SyncHistoryRecord }) => {
    const config = STATUS_CONFIG[item.status];
    const time = new Date(item.syncedAt).toLocaleString('vi-VN');

    return (
      <View style={styles.historyItem}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemCode, { backgroundColor: config.color + '20' }]}>
            <Text style={[styles.itemCodeText, { color: config.color }]}>
              {config.code}
            </Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTime}>{time}</Text>
            <Text style={styles.itemCount}>
              {item.recordCount} bản ghi
            </Text>
          </View>
          <View
            style={[styles.statusPill, { backgroundColor: config.color + '20' }]}
          >
            <Text style={[styles.statusPillText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>
        {item.errorMessage && (
          <Text style={styles.errorMessage}>{item.errorMessage}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{MOCK_HISTORY.length}</Text>
          <Text style={styles.statLabel}>Tổng sync</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {totalSynced}
          </Text>
          <Text style={styles.statLabel}>Bản ghi OK</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.error }]}>
            {MOCK_HISTORY.filter((r) => r.status === 'FAILED').length}
          </Text>
          <Text style={styles.statLabel}>Thất bại</Text>
        </View>
      </View>

      <FlatList
        data={MOCK_HISTORY}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  list: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  historyItem: {
    paddingVertical: SPACING.xl,
    minHeight: 84,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCode: {
    width: 50,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  itemCodeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
  },
  itemInfo: {
    flex: 1,
  },
  itemTime: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  itemCount: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  statusPillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  errorMessage: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    marginLeft: 62,
    fontStyle: 'italic',
  },
});
