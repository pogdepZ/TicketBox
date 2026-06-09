/**
 * AppNavigator
 * Stack Navigator with 6 screens for check-in flow
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS, FONT_SIZES } from '../constants/theme';
import type { RootStackParamList } from '../types';

import LoginScreen from '../screens/LoginScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ResultScreen from '../screens/ResultScreen';
import OfflineQueueScreen from '../screens/OfflineQueueScreen';
import SyncHistoryScreen from '../screens/SyncHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: COLORS.surface,
  },
  headerTintColor: COLORS.text,
  headerTitleStyle: {
    fontWeight: '600' as const,
    fontSize: FONT_SIZES.lg,
  },
  contentStyle: {
    backgroundColor: COLORS.background,
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={screenOptions}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Scanner"
          component={ScannerScreen}
          options={{
            title: '📷 Quét vé',
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ title: 'Kết quả' }}
        />
        <Stack.Screen
          name="OfflineQueue"
          component={OfflineQueueScreen}
          options={{ title: '📋 Offline Queue' }}
        />
        <Stack.Screen
          name="SyncHistory"
          component={SyncHistoryScreen}
          options={{ title: '🔄 Lịch sử Sync' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: '⚙️ Cài đặt' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
