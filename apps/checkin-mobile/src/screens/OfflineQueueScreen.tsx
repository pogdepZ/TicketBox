import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CloudOff, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import { queueService } from '../services/queue';
import { apiService } from '../services/api';
import type { OfflineQueueItem, SyncResultItem } from '../types';

export default function OfflineQueueScreen() {
  const navigation = useNavigation();
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unsynced'>('all');
  const [syncing, setSyncing] = useState(false);

  const loadQueue = async () => {
    const data = await queueService.getQueue();
    // Sort descending by checkedAt
    data.sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime());
    setQueue(data);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadQueue();
    }, [])
  );

  const counts = {
    total: queue.length,
    pending: queue.filter((i) => i.syncStatus === 'PENDING').length,
    failed: queue.filter((i) => i.syncStatus === 'FAILED').length,
    synced: queue.filter((i) => i.syncStatus === 'SYNCED').length,
  };

  const unsyncedCount = counts.pending + counts.failed;
  const displayed = filter === 'unsynced' ? queue.filter(q => q.syncStatus !== 'SYNCED') : queue;

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
          clientEventId: item.id,
        }))
      });

      if (response.success && response.data) {
        let db: any = null;
        try {
          db = require('../services/db').db;
        } catch (e) {}

        for (const res of response.data.results) {
          const item = toSync.find((i) => i.ticketId === res.ticketId);
          if (item) {
            await queueService.updateItemStatus(item.id, res.status);
            if ((res.status === 'SYNCED' || res.status === 'CONFLICT') && db) {
              try {
                await db.runAsync('UPDATE ticket_snapshot SET status = ? WHERE ticketCode = ?', ['USED', item.ticketCode]);
              } catch (e) {
                console.error("Failed to update snapshot after sync", e);
              }
            }
          }
        }
      } else {
        for (const item of toSync) {
          await queueService.updateItemStatus(item.id, 'FAILED', response.message || 'Error');
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
    const isSynced = item.syncStatus === 'SYNCED';
    const isFailed = item.syncStatus === 'FAILED';
    const isConflict = item.syncStatus === 'CONFLICT';
    const isRejected = item.syncStatus === 'REJECTED';
    const time = new Date(item.checkedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    let statusColor = COLORS.warning;
    let statusLabel = 'PENDING';
    if (isSynced) { statusColor = COLORS.success; statusLabel = 'SYNCED'; }
    if (isFailed) { statusColor = COLORS.error; statusLabel = 'FAILED'; }
    if (isConflict) { statusColor = COLORS.warning; statusLabel = 'CONFLICT'; }
    if (isRejected) { statusColor = COLORS.error; statusLabel = 'REJECTED'; }

    return (
      <View style={styles.queueItem}>
        {/* Mock Avatar based on ticket code */}
        <View style={[styles.avatar, { backgroundColor: isSynced ? COLORS.success + '20' : COLORS.warning + '20' }]}>
          <Text style={[styles.avatarText, { color: isSynced ? COLORS.success : COLORS.warning }]}>
            {item.ticketCode.substring(item.ticketCode.length - 2)}
          </Text>
        </View>
        <View style={styles.queueItemCenter}>
          <Text style={styles.ticketCode} numberOfLines={1}>{item.ticketCode}</Text>
          <Text style={styles.ticketTime}>{time} {item.syncAttempts > 0 ? `· ${item.syncAttempts} attempts` : ''}</Text>
          {item.lastSyncError && (
             <Text style={styles.errorText} numberOfLines={1}>{item.lastSyncError}</Text>
          )}
        </View>
        <View style={styles.queueItemRight}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '1A', borderColor: statusColor + '40' }]}>
             <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
             <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={COLORS.textMuted} size={20} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.subtitle}>LOCAL BUFFER</Text>
        <Text style={styles.title}>Offline Queue</Text>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: COLORS.text }]}>{counts.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: COLORS.warning }]}>{counts.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: COLORS.error }]}>{counts.failed}</Text>
          <Text style={styles.summaryLabel}>Failed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: COLORS.success }]}>{counts.synced}</Text>
          <Text style={styles.summaryLabel}>Synced</Text>
        </View>
      </View>

      {/* Unsynced banner */}
      {unsyncedCount > 0 && (
        <View style={styles.unsyncedBanner}>
          <CloudOff color={COLORS.warning} size={16} style={{ marginRight: 8 }} />
          <Text style={styles.unsyncedText}>
            <Text style={{ fontWeight: 'bold' }}>{unsyncedCount} scans</Text> pending upload
          </Text>
          <Text style={styles.notSavedBadge}>NOT SAVED</Text>
        </View>
      )}

      {/* Filter tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, filter === 'all' ? styles.tabBtnActive : styles.tabBtnInactive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabBtnText, filter === 'all' ? styles.tabBtnTextActive : styles.tabBtnTextInactive]}>
            All ({counts.total})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, filter === 'unsynced' ? styles.tabBtnActive : styles.tabBtnInactive]}
          onPress={() => setFilter('unsynced')}
        >
          <Text style={[styles.tabBtnText, filter === 'unsynced' ? styles.tabBtnTextActive : styles.tabBtnTextInactive]}>
            Unsynced ({unsyncedCount})
          </Text>
        </TouchableOpacity>
        
        {unsyncedCount > 0 && (
          <TouchableOpacity 
            style={styles.syncBtn}
            onPress={handleSyncNow}
            disabled={syncing}
          >
            {syncing ? <ActivityIndicator size="small" color="#000" /> : <RefreshCw color="#000" size={14} />}
            <Text style={styles.syncBtnText}>{syncing ? '...' : 'Sync'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  titleContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  unsyncedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.warning + '14',
    borderWidth: 1,
    borderColor: COLORS.warning + '33',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unsyncedText: {
    color: COLORS.warning,
    fontSize: 12,
    flex: 1,
  },
  notSavedBadge: {
    color: COLORS.warning,
    fontSize: 10,
    opacity: 0.6,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabBtnActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  tabBtnInactive: {
    backgroundColor: COLORS.backgroundSecondary,
    borderColor: COLORS.border,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: COLORS.background,
  },
  tabBtnTextInactive: {
    color: COLORS.textMuted,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  syncBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    gap: 8,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  queueItemCenter: {
    flex: 1,
  },
  ticketCode: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  ticketTime: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 10,
    marginTop: 2,
  },
  queueItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
  }
});
