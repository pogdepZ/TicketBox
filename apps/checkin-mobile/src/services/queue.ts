import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineQueueItem } from '../types';

const QUEUE_KEY = 'offline_checkin_queue';

export const queueService = {
  async getQueue(): Promise<OfflineQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading queue', e);
      return [];
    }
  },

  async enqueue(item: OfflineQueueItem): Promise<void> {
    try {
      const current = await this.getQueue();
      // Ensure no strict duplicates
      if (!current.find((i) => i.id === item.id)) {
        current.push(item);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(current));
      }
    } catch (e) {
      console.error('Error enqueuing item', e);
    }
  },

  async updateItemStatus(id: string, status: OfflineQueueItem['syncStatus'], error?: string): Promise<void> {
    try {
      const current = await this.getQueue();
      const idx = current.findIndex((i) => i.id === id);
      if (idx >= 0) {
        current[idx].syncStatus = status;
        current[idx].syncAttempts += 1;
        if (error) {
          current[idx].lastSyncError = error;
        }
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(current));
      }
    } catch (e) {
      console.error('Error updating queue item', e);
    }
  },

  async removeSynced(): Promise<void> {
    try {
      const current = await this.getQueue();
      const filtered = current.filter((i) => i.syncStatus !== 'SYNCED');
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error removing synced items', e);
    }
  },

  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
};
