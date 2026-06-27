/**
 * AppNavigator
 * Stack Navigator with 6 screens for check-in flow
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import type { RootStackParamList } from '../types';
import { apiService } from '../services/api';

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
  headerShown: false,
  contentStyle: {
    backgroundColor: COLORS.background,
  },
};

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<"Login" | "Scanner" | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      const isAuthenticated = await apiService.restoreAuthSession();
      if (isMounted) {
        setInitialRoute(isAuthenticated ? "Scanner" : "Login");
      }
    }

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.bootstrapContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
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

const styles = {
  bootstrapContainer: {
    alignItems: "center" as const,
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center" as const,
  },
};
