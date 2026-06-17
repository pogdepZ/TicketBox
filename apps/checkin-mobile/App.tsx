/**
 * TicketBox Check-in Mobile App
 * Entry point
 */

import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { initDb } from './src/services/db';

export default function App() {
  useEffect(() => {
    initDb();
  }, []);

  return <AppNavigator />;
}
