/**
 * TicketBox Check-in Mobile App
 * Entry point
 */

import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { initDb } from './src/services/db';
import { syncQueue } from './src/services/sync';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  useEffect(() => {
    initDb();

    // Auto-sync polling every 10 seconds
    const interval = setInterval(async () => {
      try {
        const autoSyncStr = await AsyncStorage.getItem('auto_sync_enabled');
        // By default, Auto-Sync is ON unless explicitly turned off
        if (autoSyncStr !== 'false') {
          await syncQueue();
        }
      } catch (e) {
        console.error('Auto-sync check error:', e);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return <AppNavigator />;
}
