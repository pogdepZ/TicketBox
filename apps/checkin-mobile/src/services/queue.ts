import { db } from './db';
import type { OfflineQueueItem } from '../types';

export const queueService = {
  async getQueue(): Promise<OfflineQueueItem[]> {
    try {
      const rows = await db.getAllAsync('SELECT * FROM checkin_log ORDER BY checkedAt DESC') as any[];
      return rows.map(row => ({
        id: row.id,
        ticketId: row.ticketId || undefined,
        ticketCode: row.ticketCode || undefined,
        guestCode: row.guestCode || undefined,
        qrCodeData: row.qrCodeData,
        concertId: row.concertId,
        staffId: row.staffId,
        sourceDeviceId: row.deviceId,
        scanResult: row.scanResult,
        gate: row.gate || undefined,
        checkedAt: row.checkedAt,
        syncStatus: row.syncStatus,
        syncAttempts: row.syncAttempts,
        lastSyncError: row.lastSyncError,
        serverCheckinId: null,
        createdAt: row.createdAt
      }));
    } catch (e) {
      console.error('Error reading queue from db', e);
      return [];
    }
  },

  async enqueue(item: OfflineQueueItem): Promise<void> {
    try {
      // Avoid inserting duplicates
      const existing = await db.getFirstAsync('SELECT id FROM checkin_log WHERE id = ?', [item.id]);
      if (!existing) {
        await db.runAsync(`
          INSERT INTO checkin_log (
            id, ticketId, ticketCode, guestCode, qrCodeData, concertId, staffId, deviceId, scanResult, gate, checkedAt, isOffline, syncStatus, syncAttempts, lastSyncError, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          item.id,
          item.ticketId || null,
          item.ticketCode || null,
          item.guestCode || null,
          item.qrCodeData,
          item.concertId,
          item.staffId,
          item.sourceDeviceId,
          item.scanResult || 'UNKNOWN',
          item.gate || null,
          item.checkedAt,
          1,
          item.syncStatus,
          item.syncAttempts,
          item.lastSyncError || null,
          item.createdAt
        ]);
      }
    } catch (e) {
      console.error('Error enqueuing item to db', e);
    }
  },

  async updateItemStatus(id: string, status: OfflineQueueItem['syncStatus'], error?: string): Promise<void> {
    try {
      if (error) {
        await db.runAsync(
          `UPDATE checkin_log SET syncStatus = ?, syncAttempts = syncAttempts + 1, lastSyncError = ? WHERE id = ?`,
          [status, error, id]
        );
      } else {
        await db.runAsync(
          `UPDATE checkin_log SET syncStatus = ?, syncAttempts = syncAttempts + 1 WHERE id = ?`,
          [status, id]
        );
      }
    } catch (e) {
      console.error('Error updating queue item in db', e);
    }
  },

  async removeSynced(): Promise<void> {
    try {
      await db.runAsync(`DELETE FROM checkin_log WHERE syncStatus = 'SYNCED'`);
    } catch (e) {
      console.error('Error removing synced items from db', e);
    }
  },

  async clearQueue(): Promise<void> {
    try {
      await db.runAsync('DELETE FROM checkin_log');
    } catch (e) {
      console.error('Error clearing queue in db', e);
    }
  }
};
