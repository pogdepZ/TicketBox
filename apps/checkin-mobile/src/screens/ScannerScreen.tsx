/**
 * ScannerScreen
 * - Mock camera frame (yellow square)
 * - Concert name display
 * - 4 simulation buttons: Success, Duplicate, Not Found, Wrong Event
 * - Results via navigation to ResultScreen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import { apiService } from '../services/api';
import { queueService } from '../services/queue';
import type { RootStackParamList, TicketInfo, ScanStatus, OfflineQueueItem } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

const MOCK_CONCERT = {
  id: 'concert-001',
  name: 'Sơn Tùng M-TP - Sky Tour 2026',
};

const MOCK_TICKETS: Record<ScanStatus, TicketInfo> = {
  SUCCESS: {
    ticketId: 'ticket-001',
    guestName: 'Nguyễn Văn An',
    ticketType: 'VIP',
    ticketCode: 'TKB-2026-VIP-001',
    concertName: MOCK_CONCERT.name,
    checkedInAt: new Date().toISOString(),
    status: 'SUCCESS',
  },
  DUPLICATE: {
    ticketId: 'ticket-002',
    guestName: 'Trần Thị Bình',
    ticketType: 'SVIP',
    ticketCode: 'TKB-2026-SVIP-002',
    concertName: MOCK_CONCERT.name,
    checkedInAt: new Date().toISOString(),
    status: 'DUPLICATE',
  },
  NOT_FOUND: {
    ticketId: 'ticket-unknown',
    guestName: 'Không xác định',
    ticketType: 'N/A',
    ticketCode: 'INVALID-CODE',
    concertName: MOCK_CONCERT.name,
    checkedInAt: new Date().toISOString(),
    status: 'NOT_FOUND',
  },
  WRONG_EVENT: {
    ticketId: 'ticket-003',
    guestName: 'Lê Hoàng Cường',
    ticketType: 'GA',
    ticketCode: 'TKB-2026-GA-003',
    concertName: 'Concert khác - Không phải sự kiện hiện tại',
    checkedInAt: new Date().toISOString(),
    status: 'WRONG_EVENT',
  },
};

const SCAN_BUTTONS: { status: ScanStatus; label: string; color: string; tone: string }[] = [
  { status: 'SUCCESS', label: 'Hợp lệ', color: COLORS.success, tone: 'OK' },
  { status: 'DUPLICATE', label: 'Đã check-in', color: COLORS.warning, tone: '2X' },
  { status: 'NOT_FOUND', label: 'Không tồn tại', color: COLORS.error, tone: 'NO' },
  { status: 'WRONG_EVENT', label: 'Sai sự kiện', color: COLORS.errorDark, tone: 'EV' },
];

export default function ScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isOffline, setIsOffline] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleScan = async (status: ScanStatus) => {
    if (scanning) return;
    setScanning(true);

    const mockTicket = MOCK_TICKETS[status];
    
    // Attempt online scan
    try {
      const userStr = await AsyncStorage.getItem('auth_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const staffId = user?.id || 'staff-001';
      const deviceId = 'device-A'; // Should come from settings in real app

      const payload = {
        qrCodeData: mockTicket.ticketCode,
        staffId,
        concertId: MOCK_CONCERT.id,
        deviceId,
        clientEventId: `scan-${Date.now()}`,
      };

      const response = await apiService.post<TicketInfo>('/checkin/scan', payload);

      if (response.success && response.data) {
        setIsOffline(false);
        navigation.navigate('Result', { ticket: response.data, isOffline: false });
      } else {
        // If API fails with error or timeout, treat as offline
        const isNetworkError = !response.data || response.message?.toLowerCase().includes('fetch') || response.message?.toLowerCase().includes('timeout');
        
        if (isNetworkError) {
          setIsOffline(true);
          const checkedAt = new Date().toISOString();
          
          const offlineItem: OfflineQueueItem = {
            id: `q-${Date.now()}`,
            ticketId: mockTicket.ticketId,
            ticketCode: mockTicket.ticketCode,
            qrCodeData: mockTicket.ticketCode,
            concertId: MOCK_CONCERT.id,
            staffId,
            sourceDeviceId: deviceId,
            checkedAt,
            syncStatus: 'PENDING',
            syncAttempts: 0,
            lastSyncError: null,
            serverCheckinId: null,
            createdAt: checkedAt,
          };

          await queueService.enqueue(offlineItem);

          // Construct a display ticket for offline
          const displayTicket: TicketInfo = {
            ...mockTicket, // Use mock info for display since we can't fetch it
            checkedInAt: checkedAt,
            status: 'SUCCESS', // Always allow in offline mode
          };

          navigation.navigate('Result', { ticket: displayTicket, isOffline: true });
        } else {
          // It's a server error or rejection, don't queue
          Alert.alert('Lỗi quét vé', response.message || 'Lỗi không xác định');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.concertBanner}>
        <View>
          <Text style={styles.concertLabel}>Cổng đang hoạt động</Text>
          <Text style={styles.concertName}>{MOCK_CONCERT.name}</Text>
        </View>
        <View style={[styles.livePill, isOffline && { backgroundColor: COLORS.error + '14', borderColor: COLORS.error + '55' }]}>
          <View style={[styles.liveDot, isOffline && { backgroundColor: COLORS.error }]} />
          <Text style={[styles.liveText, isOffline && { color: COLORS.errorLight }]}>
            {isOffline ? 'Offline' : 'Online'}
          </Text>
        </View>
      </View>

      <View style={styles.cameraContainer}>
        <View style={styles.scanHeader}>
          <Text style={styles.cameraSectionLabel}>Khung quét</Text>
          <Text style={styles.scanCounter}>128 vào cổng</Text>
        </View>
        <View style={styles.cameraFrame}>
          <View style={styles.cameraGridLineV} />
          <View style={styles.cameraGridLineH} />
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          <View style={styles.scanLine} />
          <Text style={styles.cameraText}>Sẵn sàng</Text>
          <Text style={styles.cameraHint}>Đưa QR vào vùng sáng</Text>
          <Text style={styles.cameraSubHint}>
            Mã hợp lệ sẽ chuyển sang màn hình kết quả ngay lập tức
          </Text>
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <View style={styles.buttonsHeader}>
          <Text style={styles.buttonsTitle}>Mô phỏng quét</Text>
          <Text style={styles.buttonsHint}>Chọn trạng thái để test luồng</Text>
        </View>
        <View style={styles.buttonGrid}>
          {SCAN_BUTTONS.map((btn) => (
            <TouchableOpacity
              key={btn.status}
              style={[styles.scanButton, { borderColor: btn.color + '66' }]}
              onPress={() => handleScan(btn.status)}
              activeOpacity={0.82}
            >
              <View style={[styles.scanTone, { backgroundColor: btn.color + '20' }]}>
                <Text style={[styles.scanToneText, { color: btn.color }]}>
                  {btn.tone}
                </Text>
              </View>
              <Text style={styles.scanButtonText}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('OfflineQueue')}
        >
          <Text style={styles.navIcon}>03</Text>
          <Text style={styles.navLabel}>Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('SyncHistory')}
        >
          <Text style={styles.navIcon}>OK</Text>
          <Text style={styles.navLabel}>Sync</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.navIcon}>ID</Text>
          <Text style={styles.navLabel}>Cài đặt</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  concertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  concertLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  concertName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginTop: 2,
    maxWidth: 245,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '14',
    borderWidth: 1,
    borderColor: COLORS.success + '55',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: SPACING.xs,
  },
  liveText: {
    color: COLORS.successLight,
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
  },
  cameraContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  cameraSectionLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
  scanCounter: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  cameraFrame: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cameraGridLineV: {
    position: 'absolute',
    top: 28,
    bottom: 28,
    width: 1,
    backgroundColor: COLORS.border,
    opacity: 0.45,
  },
  cameraGridLineH: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.45,
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: COLORS.primary,
  },
  cornerTL: {
    top: 14,
    left: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: BORDER_RADIUS.lg,
  },
  cornerTR: {
    top: 14,
    right: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: BORDER_RADIUS.lg,
  },
  cornerBL: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: BORDER_RADIUS.lg,
  },
  cornerBR: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: BORDER_RADIUS.lg,
  },
  scanLine: {
    position: 'absolute',
    left: 42,
    right: 42,
    height: 2,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.8,
  },
  cameraText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
  },
  cameraHint: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.sm,
  },
  cameraSubHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  buttonsContainer: {
    paddingHorizontal: SPACING.xl,
    flex: 1,
  },
  buttonsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  buttonsTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
  buttonsHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  scanButton: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface + 'CC',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  scanTone: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  scanToneText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
  },
  scanButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderWidth: 1,
    borderTopColor: COLORS.border,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.lg,
  },
  navButton: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    minWidth: 72,
  },
  navIcon: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
    width: 34,
    height: 28,
    lineHeight: 28,
    textAlign: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceRaised,
    overflow: 'hidden',
  },
  navLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
});
