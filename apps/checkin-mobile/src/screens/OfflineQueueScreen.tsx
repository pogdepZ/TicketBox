/**
 * OfflineQueueScreen
 * - Display list of un-synced check-ins (3-5 mock items)
 * - Status: PENDING, SYNCED, FAILED
 * - "Sync ngay" button → delay 1s → change status to SYNCED
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import { Button } from '../components';
import { queueService } from '../services/queue';
import { apiService } from '../services/api';
import type { OfflineQueueItem, SyncStatus, SyncResultItem } from '../types';
import { useFocusEffect } from '@react-navigation/native';


const STATUS_ICON: Record<SyncStatus, { code: string; color: string; label: string }> = {
  PENDING: { code: 'WAIT', color: COLORS.warning, label: 'Chờ sync' },
  SYNCED: { code: 'OK', color: COLORS.success, label: 'Đã sync' },
  FAILED: { code: 'FAIL', color: COLORS.error, label: 'Thất bại' },
};

export default function OfflineQueueScreen() {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadQueue = async () => {
    const data = await queueService.getQueue();
    setQueue(data);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadQueue();
    }, [])
  );

  const pendingCount = queue.filter((i) => i.syncStatus === 'PENDING').length;
  const failedCount = queue.filter((i) => i.syncStatus === 'FAILED').length;

  const handleSyncNow = async () => {
    const toSync = queue.filter((i) => i.syncStatus === 'PENDING' || i.syncStatus === 'FAILED');
    if (toSync.length === 0) return;

    setSyncing(true);
    try {
      const response = await apiService.post<{ results: SyncResultItem[] }>('/checkin/sync', {
        items: toSync.map(item => ({
          ticketId: item.ticketId,
          qrCodeData: item.qrCodeData,
          concertId: item.concertId,
          staffId: item.staffId,
          sourceDeviceId: item.sourceDeviceId,
          checkedAt: item.checkedAt,
        }))
      });

      if (response.success && response.data) {
        for (const res of response.data.results) {
          const item = toSync.find((i) => i.ticketId === res.ticketId);
          if (item) {
            await queueService.updateItemStatus(item.id, res.status);
          }
        }
      } else {
        // Mark all as failed
        for (const item of toSync) {
          await queueService.updateItemStatus(item.id, 'FAILED', response.message || 'Lỗi không xác định');
        }
      }
    } catch (e) {
      for (const item of toSync) {
        await queueService.updateItemStatus(item.id, 'FAILED', 'Network error');
      }
    } finally {
      await loadQueue();
      setSyncing(false);
    }
  };

  const renderItem = ({ item }: { item: OfflineQueueItem }) => {
    const statusCfg = STATUS_ICON[item.syncStatus];
    const time = new Date(item.checkedAt).toLocaleTimeString('vi-VN');

    return (
      <View style={styles.queueItem}>
        <View style={styles.queueItemLeft}>
          <View style={[styles.queueCode, { backgroundColor: statusCfg.color + '20' }]}>
            <Text style={[styles.queueCodeText, { color: statusCfg.color }]}>
              {statusCfg.code}
            </Text>
          </View>
        </View>
        <View style={styles.queueItemCenter}>
          <Text style={styles.ticketCode}>{item.ticketCode}</Text>
          <Text style={styles.ticketTime}>{time}</Text>
          {item.lastSyncError && (
            <Text style={styles.errorText}>Lỗi: {item.lastSyncError}</Text>
          )}
        </View>
        <View style={styles.queueItemRight}>
          <Text style={[styles.statusBadge, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
          <Text style={styles.attemptText}>
            {item.syncAttempts} lần thử
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: COLORS.warning }]}>
            {pendingCount}
          </Text>
          <Text style={styles.summaryLabel}>Chờ sync</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: COLORS.error }]}>
            {failedCount}
          </Text>
          <Text style={styles.summaryLabel}>Thất bại</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: COLORS.success }]}>
            {queue.filter((i) => i.syncStatus === 'SYNCED').length}
          </Text>
          <Text style={styles.summaryLabel}>Đã sync</Text>
        </View>
      </View>

      <Button
        title={syncing ? "Đang sync..." : "Đồng bộ lại ngay"}
        onPress={handleSyncNow}
        loading={syncing}
        style={{ marginHorizontal: SPACING.xl, marginVertical: SPACING.lg }}
      />

      <FlatList
        data={queue}
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
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    borderBottomWidth: 1,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryCount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    minHeight: 88,
  },
  queueItemLeft: {
    marginRight: SPACING.md,
  },
  queueCode: {
    width: 54,
    height: 38,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueCodeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
  },
  queueItemCenter: {
    flex: 1,
  },
  ticketCode: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  ticketTime: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  errorText: {
    color: COLORS.errorLight,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  queueItemRight: {
    alignItems: 'flex-end',
    maxWidth: 86,
  },
  statusBadge: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  attemptText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
});
