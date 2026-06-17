/**
 * AppNavigator
 * Stack Navigator with 6 screens for check-in flow
 */

import React from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS, FONT_SIZES, SPACING } from '../constants/theme';
import type { RootStackParamList } from '../types';

import LoginScreen from '../screens/LoginScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ResultScreen from '../screens/ResultScreen';
import OfflineQueueScreen from '../screens/OfflineQueueScreen';
import SyncHistoryScreen from '../screens/SyncHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SnapshotScreen from '../screens/SnapshotScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.backgroundSecondary,
    primary: COLORS.primary,
    text: COLORS.text,
    border: COLORS.border,
  },
};

const screenOptions = {
  headerStyle: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  headerTintColor: COLORS.text,
  headerTitleStyle: {
    fontWeight: '600' as const,
    fontSize: FONT_SIZES.lg,
  },
  headerShadowVisible: false,
  headerBackTitle: '',
  headerTitleAlign: 'left' as const,
  headerTitleContainerStyle: {
    paddingLeft: SPACING.xs,
  },
  contentStyle: {
    backgroundColor: COLORS.background,
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
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
            title: 'Quét vé',
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
          options={{ title: 'Hàng đợi offline' }}
        />
        <Stack.Screen
          name="SyncHistory"
          component={SyncHistoryScreen}
          options={{ title: 'Lịch sử đồng bộ' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Cài đặt' }}
        />
        <Stack.Screen
          name="Snapshot"
          component={SnapshotScreen}
          options={{ title: 'Tải dữ liệu Offline' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
