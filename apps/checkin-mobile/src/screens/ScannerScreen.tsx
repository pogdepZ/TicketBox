import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, Zap, Search, CloudOff, RefreshCw, Settings as SettingsIcon, ChevronDown } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import { apiService } from '../services/api';
import { queueService } from '../services/queue';
import type { RootStackParamList, TicketInfo, ScanStatus, OfflineQueueItem, Concert } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

// MOCK_CONCERT removed

// --- Mock Status ---
const STATUS_CONFIG = {
  SUCCESS: { label: 'HỢP LỆ', dot: COLORS.success, bg: COLORS.success + '1A', border: COLORS.success + '40', color: COLORS.success },
  TEMP_ACCEPTED: { label: 'TẠM NHẬN', dot: COLORS.success, bg: COLORS.success + '1A', border: COLORS.success + '40', color: COLORS.success },
  DUPLICATE: { label: 'ĐÃ DÙNG', dot: COLORS.warning, bg: COLORS.warning + '1A', border: COLORS.warning + '40', color: COLORS.warning },
  NOT_FOUND: { label: 'KHÔNG TÌM THẤY', dot: COLORS.error, bg: COLORS.error + '1A', border: COLORS.error + '40', color: COLORS.error },
  WRONG_EVENT: { label: 'SAI SỰ KIỆN', dot: COLORS.error, bg: COLORS.error + '1A', border: COLORS.error + '40', color: COLORS.error },
  WRONG_ZONE: { label: 'SAI CỔNG', dot: COLORS.error, bg: COLORS.error + '1A', border: COLORS.error + '40', color: COLORS.error },
};

export default function ScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const [isOffline, setIsOffline] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  
  const [concert, setConcert] = useState<Partial<Concert>>({ id: '', name: 'No Active Concert' });
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(0);
  const [total, setTotal] = useState(0);
  const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadData = async () => {
        try {
          const storedConcert = await AsyncStorage.getItem('selected_concert');
          let activeConcertId = '';
          if (storedConcert) {
            const parsed = JSON.parse(storedConcert);
            activeConcertId = parsed.id;
            if (isMounted) setConcert(parsed);
          }

          const { db } = require('../services/db');
          const totalRes: any[] = await db.getAllAsync('SELECT COUNT(*) as c FROM ticket_snapshot WHERE concertId = ?', [activeConcertId]);
          const checkedRes: any[] = await db.getAllAsync('SELECT COUNT(*) as c FROM ticket_snapshot WHERE status IN ("USED", "TEMP_ACCEPTED") AND concertId = ?', [activeConcertId]);
          
          if (isMounted) {
            setTotal(totalRes[0]?.c || 0);
            setCheckedIn(checkedRes[0]?.c || 0);
          }
        } catch (e) {
          console.error('Failed to load stats', e);
        }
      };
      loadData();
      return () => { isMounted = false; };
    }, [])
  );

  // Animations
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for online indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Subscribe to connection status changes (e.g. from background sync)
    const unsubscribe = apiService.onConnectionStatusChange((status) => {
      setIsOffline(status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      scanAnim.stopAnimation();
      scanAnim.setValue(0);
    }
  }, [scanning]);

  const handleScan = async (qrData: string) => {
    if (scanning || !isFocused) return;
    setScanning(true);

    try {
      const userStr = await AsyncStorage.getItem('auth_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const staffId = user?.id;
      const deviceId = '00000000-0000-0000-0000-000000000002';

      const payload = {
        qrCodeData: qrData,
        staffId,
        concertId: concert.id,
        deviceId,
        clientEventId: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        gate: selectedGate || undefined,
      };

      const response = await apiService.post<TicketInfo>('/checkin/scan', payload);

      if (response.success && response.data) {
        setIsOffline(false);
        try {
          const { db } = require('../services/db');
          const { ticketCode } = response.data;
          if (ticketCode) {
            await db.runAsync('UPDATE ticket_snapshot SET status = "USED" WHERE ticketCode = ?', [ticketCode]);
            await db.runAsync('UPDATE guest_snapshot SET status = "CHECKED_IN" WHERE guestCode = ?', [ticketCode]);
          }
        } catch (e) {
          console.error('Failed to update local db after online scan', e);
        }
        navigation.navigate('Result', { ticket: response.data, isOffline: false });
      } else {
        const isNetworkError = !response.data || response.message?.toLowerCase().includes('fetch') || response.message?.toLowerCase().includes('timeout');

        if (isNetworkError) {
          setIsOffline(true);
          const checkedAt = new Date().toISOString();

          let isValid = false;
          let extractedTicketCode = qrData;
          
          try {
            const { jwtDecode } = require('jwt-decode');
            const CryptoJS = require('crypto-js');
            const { db } = require('../services/db');

            const parts = qrData.split('.');
            if (parts.length === 3) {
              const header = parts[0];
              const payload = parts[1];
              const signature = parts[2];
              
              const concertCache: any[] = await db.getAllAsync('SELECT publicKey FROM concert_cache LIMIT 1');
              if (concertCache && concertCache.length > 0) {
                const publicKey = concertCache[0].publicKey;
                
                const hmac = CryptoJS.HmacSHA256(`${header}.${payload}`, publicKey);
                let expectedSignature = CryptoJS.enc.Base64.stringify(hmac);
                expectedSignature = expectedSignature.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
                
                if (signature === expectedSignature) {
                   isValid = true;
                   const decoded = jwtDecode(qrData) as any;
                   if (decoded && decoded.ticket_code) {
                     extractedTicketCode = decoded.ticket_code;
                   }
                }
              }
            }
          } catch (e) {
             console.error("Offline verify error", e);
          }

          let localTicket = null;
          let localGuest = null;
          try {
            const { db } = require('../services/db');
            if (isValid) {
              const tickets: any[] = await db.getAllAsync(
                'SELECT * FROM ticket_snapshot WHERE ticketCode = ?',
                [extractedTicketCode]
              );
              if (tickets && tickets.length > 0) {
                localTicket = tickets[0];
              }
            } else {
              // If not valid JWT, could be a Guest Code
              const guests: any[] = await db.getAllAsync(
                'SELECT * FROM guest_snapshot WHERE guestCode = ?',
                [extractedTicketCode]
              );
              if (guests && guests.length > 0) {
                localGuest = guests[0];
                isValid = true; // Mark as valid guest code
              }
            }
          } catch (e) {}

          if (!isValid || (!localTicket && !localGuest)) {
             const notFoundTicket: TicketInfo = {
               ticketId: 'unknown',
               ticketCode: extractedTicketCode,
               guestName: 'Unknown',
               ticketType: '---',
               concertName: concert.name || 'Unknown Concert',
               venue: concert.venueName || 'Unknown Venue',
               orderRef: 'N/A',
               checkedInAt: checkedAt,
               status: isValid ? 'NOT_FOUND' : 'INVALID_GUEST',
             };
             navigation.navigate('Result', { ticket: notFoundTicket, isOffline: true });
             setTimeout(() => setScanning(false), 2000);
             return;
          }

          if (localTicket) {
            let allowedGates: string[] = [];
            try {
              if (localTicket.allowedGates) {
                allowedGates = JSON.parse(localTicket.allowedGates);
              }
            } catch (e) {}

            if (selectedGate && allowedGates.length > 0 && !allowedGates.includes(selectedGate)) {
               const wrongZoneTicket: TicketInfo = {
                 ticketId: localTicket.id,
                 ticketCode: extractedTicketCode,
                 guestName: localTicket.guestName,
                 ticketType: localTicket.ticketType,
                 seat: localTicket.seat || undefined,
                 concertName: concert.name || 'Unknown Concert',
                 venue: concert.venueName || 'Unknown Venue',
                 orderRef: localTicket.orderRef || 'N/A',
                 checkedInAt: checkedAt,
                 status: 'WRONG_ZONE',
               };
               navigation.navigate('Result', { ticket: wrongZoneTicket, isOffline: true });
               setTimeout(() => setScanning(false), 2000);
               return;
            }

            if (localTicket.status === 'USED' || localTicket.status === 'TEMP_ACCEPTED') {
               const duplicateTicket: TicketInfo = {
                 ticketId: localTicket.id,
                 ticketCode: extractedTicketCode,
                 guestName: localTicket.guestName,
                 ticketType: localTicket.ticketType,
                 seat: localTicket.seat || undefined,
                 concertName: concert.name || 'Unknown Concert',
                 venue: concert.venueName || 'Unknown Venue',
                 orderRef: localTicket.orderRef || 'N/A',
                 checkedInAt: checkedAt,
                 status: 'DUPLICATE',
               };
               navigation.navigate('Result', { ticket: duplicateTicket, isOffline: true });
               setTimeout(() => setScanning(false), 2000);
               return;
            }

            try {
               const { db } = require('../services/db');
               await db.runAsync('UPDATE ticket_snapshot SET status = ? WHERE ticketCode = ?', ['TEMP_ACCEPTED', extractedTicketCode]);
            } catch (e) {}

            const offlineItem: OfflineQueueItem = {
              id: `q-${Date.now()}`,
              ticketId: localTicket.id,
              ticketCode: extractedTicketCode,
              qrCodeData: qrData,
              concertId: concert.id || '',
              staffId,
              sourceDeviceId: deviceId,
              checkedAt,
              syncStatus: 'PENDING',
              syncAttempts: 0,
              lastSyncError: null,
              serverCheckinId: null,
              createdAt: checkedAt,
              gate: selectedGate || undefined,
            };

            await queueService.enqueue(offlineItem);

            const displayTicket: TicketInfo = {
              ticketId: localTicket.id,
              ticketCode: extractedTicketCode,
              guestName: localTicket.guestName,
              ticketType: localTicket.ticketType,
              seat: localTicket.seat || undefined,
              concertName: concert.name || 'Unknown Concert',
              venue: concert.venueName || 'Unknown Venue',
              orderRef: localTicket.orderRef || 'N/A',
              checkedInAt: checkedAt,
              status: 'TEMP_ACCEPTED',
            };
            navigation.navigate('Result', { ticket: displayTicket, isOffline: true });
          } else if (localGuest) {
            let allowedGates: string[] = [];
            try {
              if (localGuest.allowedGates) {
                allowedGates = JSON.parse(localGuest.allowedGates);
              }
            } catch (e) {}

            if (selectedGate && allowedGates.length > 0 && !allowedGates.includes(selectedGate)) {
               const wrongZoneTicket: TicketInfo = {
                 ticketId: localGuest.id,
                 ticketCode: extractedTicketCode,
                 guestName: localGuest.fullName,
                 ticketType: 'GUEST',
                 concertName: concert.name || 'Unknown Concert',
                 venue: concert.venueName || 'Unknown Venue',
                 orderRef: 'GUEST-LIST',
                 checkedInAt: checkedAt,
                 status: 'WRONG_ZONE',
               };
               navigation.navigate('Result', { ticket: wrongZoneTicket, isOffline: true });
               setTimeout(() => setScanning(false), 2000);
               return;
            }

            if (localGuest.status === 'CHECKED_IN' || localGuest.status === 'TEMP_ACCEPTED') {
               const duplicateTicket: TicketInfo = {
                 ticketId: localGuest.id,
                 ticketCode: extractedTicketCode,
                 guestName: localGuest.fullName,
                 ticketType: 'GUEST',
                 concertName: concert.name || 'Unknown Concert',
                 venue: concert.venueName || 'Unknown Venue',
                 orderRef: 'GUEST-LIST',
                 checkedInAt: checkedAt,
                 status: 'DUPLICATE_GUEST',
               };
               navigation.navigate('Result', { ticket: duplicateTicket, isOffline: true });
               setTimeout(() => setScanning(false), 2000);
               return;
            }

            try {
               const { db } = require('../services/db');
               await db.runAsync('UPDATE guest_snapshot SET status = ? WHERE guestCode = ?', ['TEMP_ACCEPTED', extractedTicketCode]);
            } catch (e) {}

            const offlineItem: OfflineQueueItem = {
              id: `q-${Date.now()}`,
              ticketId: localGuest.id,
              ticketCode: extractedTicketCode,
              qrCodeData: qrData,
              concertId: concert.id || '',
              staffId,
              sourceDeviceId: deviceId,
              checkedAt,
              syncStatus: 'PENDING',
              syncAttempts: 0,
              lastSyncError: null,
              serverCheckinId: null,
              createdAt: checkedAt,
              gate: selectedGate || undefined,
            };

            await queueService.enqueue(offlineItem);

            const displayTicket: TicketInfo = {
              ticketId: localGuest.id,
              ticketCode: extractedTicketCode,
              guestName: localGuest.fullName,
              ticketType: 'GUEST',
              concertName: concert.name || 'Unknown Concert',
              venue: concert.venueName || 'Unknown Venue',
              orderRef: 'GUEST-LIST',
              checkedInAt: checkedAt,
              status: 'ACCEPTED_GUEST',
            };
            navigation.navigate('Result', { ticket: displayTicket, isOffline: true });
          }
        } else {
          Alert.alert('Lỗi quét vé', response.message || 'Lỗi không xác định');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setScanning(false), 2000);
    }
  };

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white', marginBottom: 20 }}>Chúng tôi cần quyền sử dụng Camera để quét vé.</Text>
        <TouchableOpacity style={styles.scanButton} onPress={requestPermission}>
          <Text style={styles.scanButtonText}>Cấp quyền Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 176], // Approximate height of the scan area
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.liveTag}>LIVE · {new Date().toDateString().split(' ').slice(1, 3).join(' ').toUpperCase()}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EventSelector')}>
            <Text style={[styles.concertName, { textDecorationLine: 'underline' }]}>{concert.name} ▾</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statusPill}>
          <Animated.View style={[styles.statusDot, { opacity: pulseAnim, backgroundColor: isOffline ? COLORS.error : COLORS.primary }]} />
          <Text style={[styles.statusText, isOffline && { color: COLORS.error }]}>
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: COLORS.primary }]}>{checkedIn}</Text>
          <Text style={styles.statSub}>Đã check-in</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{total - checkedIn}</Text>
          <Text style={styles.statSub}>Còn lại</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{pct}%</Text>
          <Text style={styles.statSub}>Hoàn thành</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
      </View>

      {/* Gate Selector */}
      <View style={[styles.gateSelectorContainer, { zIndex: 1000 }]}>
        <TouchableOpacity 
          style={styles.gateSelectorBtn} 
          onPress={() => setDropdownOpen(!dropdownOpen)}
          activeOpacity={0.7}
        >
          <Text style={styles.gateSelectorText}>
            📍 Cổng hiện tại: <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{selectedGate === 'Gate A' ? 'Cổng A' : selectedGate === 'Gate B' ? 'Cổng B' : 'Tất cả cổng'}</Text>
          </Text>
          <ChevronDown color={COLORS.textMuted} size={16} />
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity 
              style={styles.dropdownItem} 
              onPress={() => { setSelectedGate('Gate A'); setDropdownOpen(false); }}
            >
              <Text style={[styles.dropdownItemText, selectedGate === 'Gate A' && styles.dropdownItemActive]}>Cổng A</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem} 
              onPress={() => { setSelectedGate('Gate B'); setDropdownOpen(false); }}
            >
              <Text style={[styles.dropdownItemText, selectedGate === 'Gate B' && styles.dropdownItemActive]}>Cổng B</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dropdownItem, { borderBottomWidth: 0 }]} 
              onPress={() => { setSelectedGate(null); setDropdownOpen(false); }}
            >
              <Text style={[styles.dropdownItemText, selectedGate === null && styles.dropdownItemActive]}>Tất cả cổng</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Viewfinder */}
      <View style={styles.viewfinderWrapper}>
        <View style={styles.viewfinderContainer}>
          {isFocused && (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data }) => handleScan(data)}
            />
          )}
          {/* Simulated Dark overlay and vignette can be added here if needed */}
          <View style={styles.finderBox}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {scanning ? (
              <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
            ) : (
              <View style={styles.centerIcon}>
                <QrCode color="rgba(255,255,255,0.3)" size={40} />
              </View>
            )}
          </View>
          <View style={styles.bottomLabel}>
            <Text style={styles.bottomLabelText}>{scanning ? 'ĐANG QUÉT...' : 'HÃY HƯỚNG CAMERA VÀO QR CODE'}</Text>
          </View>
        </View>
      </View>

      {/* Spacer to push bottom nav down */}
      <View style={{ flex: 1 }} />

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('OfflineQueue')}>
          <CloudOff color={COLORS.textMuted} size={24} />
          <Text style={styles.navItemText}>Hàng đợi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Scanner')}>
          <QrCode color={COLORS.primary} size={24} />
          <Text style={[styles.navItemText, { color: COLORS.primary }]}>Quét vé</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
          <SettingsIcon color={COLORS.textMuted} size={24} />
          <Text style={styles.navItemText}>Cài đặt</Text>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.md,
  },
  liveTag: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 2,
  },
  concertName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '1A',
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  statusText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statVal: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  statSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  gateSelectorContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  gateSelectorBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gateSelectorText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 56, // height of button + padding
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 9999,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemText: {
    color: COLORS.text,
    fontSize: 14,
  },
  dropdownItemActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  viewfinderWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  viewfinderContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#080808',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  finderBox: {
    width: 176,
    height: 176,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 4,
  },
  centerIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomLabel: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomLabelText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  actionsContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.lg,
    gap: 10,
  },
  primaryActionBtn: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryActionTextBlack: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryActionBtn: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingBottom: 10, // Adjust for safe area
    paddingTop: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#000',
    fontWeight: 'bold',
  }
});
