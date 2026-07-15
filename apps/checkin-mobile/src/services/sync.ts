import { apiService } from './api';
import { queueService } from './queue';
import type { SyncResultItem } from '../types';

export const syncQueue = async (): Promise<void> => {
  const queue = await queueService.getQueue();
  const toSync = queue.filter((i) => i.syncStatus === 'PENDING' || i.syncStatus === 'FAILED');
  if (toSync.length === 0) return;

  const BATCH_SIZE = 100;

  for (let i = 0; i < toSync.length; i += BATCH_SIZE) {
    const batch = toSync.slice(i, i + BATCH_SIZE);

    try {
      const response = await apiService.post<{ results: SyncResultItem[] }>('/checkin/sync', {
        items: batch.map(item => ({
          ticketId: item.ticketId,
          qrCodeData: item.qrCodeData,
          concertId: item.concertId,
          staffId: item.staffId,
          sourceDeviceId: item.sourceDeviceId,
          checkedAt: item.checkedAt,
          clientEventId: item.id,
          gate: item.gate,
        }))
      });

      if (response.success && response.data) {
        let db: any = null;
        try {
          db = require('./db').db;
        } catch (e) {}

        let successCount = 0;
        let failCount = 0;

        for (const res of response.data.results) {
          const item = batch.find((i) => i.ticketId === res.ticketId);
          if (res.status === 'SYNCED' || res.status === 'CONFLICT') successCount++;
          else failCount++;

          if (item) {
            await queueService.updateItemStatus(item.id, res.status);
            if ((res.status === 'SYNCED' || res.status === 'CONFLICT') && db) {
              try {
                await db.runAsync('UPDATE ticket_snapshot SET status = ? WHERE ticketCode = ?', ['USED', item.ticketCode]);
                await db.runAsync('UPDATE guest_snapshot SET status = ? WHERE guestCode = ?', ['CHECKED_IN', item.ticketCode]);
              } catch (e) {
                console.error("Failed to update snapshot after sync", e);
              }
            }
          }
        }

        if (db) {
          try {
            await db.runAsync(
              'INSERT INTO sync_log (id, batchId, syncTime, totalItems, successCount, failCount, errorMessage) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [`sync-${Date.now()}`, `batch-${Date.now()}`, new Date().toISOString(), batch.length, successCount, failCount, null]
            );
          } catch (e) {
            console.error('Failed to insert sync_log', e);
          }
        }
      } else {
        for (const item of batch) {
          await queueService.updateItemStatus(item.id, 'FAILED', response.message || 'Error');
        }
      }
    } catch (e) {
      for (const item of batch) {
        await queueService.updateItemStatus(item.id, 'FAILED', 'Network error');
      }
    }
  }
};
