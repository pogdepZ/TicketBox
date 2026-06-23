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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, Zap, Search, CloudOff, RefreshCw, Settings as SettingsIcon } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import { apiService } from '../services/api';
import { queueService } from '../services/queue';
import type { RootStackParamList, TicketInfo, ScanStatus, OfflineQueueItem } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

const MOCK_CONCERT = {
  id: 'a35ba9c7-89e4-425c-9d00-8016ac4afc3d',
  name: 'Neon Frequencies', // Updated name to match design
};

// --- Mock Status ---
const STATUS_CONFIG = {
  SUCCESS: { label: 'VALID', dot: COLORS.success, bg: COLORS.success + '1A', border: COLORS.success + '40', color: COLORS.success },
  TEMP_ACCEPTED: { label: 'TEMP ACCEPTED', dot: COLORS.success, bg: COLORS.success + '1A', border: COLORS.success + '40', color: COLORS.success },
  DUPLICATE: { label: 'ALREADY USED', dot: COLORS.warning, bg: COLORS.warning + '1A', border: COLORS.warning + '40', color: COLORS.warning },
  NOT_FOUND: { label: 'INVALID', dot: COLORS.error, bg: COLORS.error + '1A', border: COLORS.error + '40', color: COLORS.error },
  WRONG_EVENT: { label: 'INVALID', dot: COLORS.error, bg: COLORS.error + '1A', border: COLORS.error + '40', color: COLORS.error },
};

export default function ScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isOffline, setIsOffline] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  
  // Stats
  const [checkedIn] = useState(847);
  const total = 1240;
  const pct = Math.round((checkedIn / total) * 100);

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
    if (scanning) return;
    setScanning(true);

    try {
      const userStr = await AsyncStorage.getItem('auth_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const staffId = user?.id;
      const deviceId = '00000000-0000-0000-0000-000000000002';

      const payload = {
        qrCodeData: qrData,
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
              
              const concertCache = await db.getAllAsync<{ publicKey: string }>('SELECT publicKey FROM concert_cache LIMIT 1');
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

          if (!isValid) {
             const notFoundTicket: TicketInfo = {
               ticketId: 'unknown',
               ticketCode: extractedTicketCode,
               guestName: 'Unknown',
               ticketType: '---',
               concertName: MOCK_CONCERT.name,
               checkedInAt: checkedAt,
               status: 'NOT_FOUND',
             };
             navigation.navigate('Result', { ticket: notFoundTicket, isOffline: true });
             setTimeout(() => setScanning(false), 2000);
             return;
          }

          let localTicket = null;
          try {
            const { db } = require('../services/db');
            const tickets = await db.getAllAsync<{ id: string, ticketCode: string, status: string, guestName: string, ticketType: string }>(
              'SELECT * FROM ticket_snapshot WHERE ticketCode = ?',
              [extractedTicketCode]
            );
            if (tickets && tickets.length > 0) {
              localTicket = tickets[0];
            }
          } catch (e) {}

          if (!localTicket) {
             const notFoundTicket: TicketInfo = {
               ticketId: 'unknown',
               ticketCode: extractedTicketCode,
               guestName: 'Unknown',
               ticketType: '---',
               concertName: MOCK_CONCERT.name,
               checkedInAt: checkedAt,
               status: 'NOT_FOUND',
             };
             navigation.navigate('Result', { ticket: notFoundTicket, isOffline: true });
             setTimeout(() => setScanning(false), 2000);
             return;
          }

          if (localTicket.status === 'USED' || localTicket.status === 'TEMP_ACCEPTED') {
             const duplicateTicket: TicketInfo = {
               ticketId: localTicket.id,
               ticketCode: extractedTicketCode,
               guestName: localTicket.guestName,
               ticketType: localTicket.ticketType,
               concertName: MOCK_CONCERT.name,
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

          const displayTicket: TicketInfo = {
            ticketId: localTicket.id,
            ticketCode: extractedTicketCode,
            guestName: localTicket.guestName,
            ticketType: localTicket.ticketType,
            concertName: MOCK_CONCERT.name,
            checkedInAt: checkedAt,
            status: 'TEMP_ACCEPTED',
          };

          navigation.navigate('Result', { ticket: displayTicket, isOffline: true });
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
          <Text style={styles.liveTag}>LIVE · JUN 22</Text>
          <Text style={styles.concertName}>{MOCK_CONCERT.name}</Text>
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
          <Text style={styles.statSub}>Checked in</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{total - checkedIn}</Text>
          <Text style={styles.statSub}>Remaining</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{pct}%</Text>
          <Text style={styles.statSub}>Complete</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
      </View>

      {/* Viewfinder */}
      <View style={styles.viewfinderWrapper}>
        <View style={styles.viewfinderContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => handleScan(data)}
          />
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
            <Text style={styles.bottomLabelText}>{scanning ? 'SCANNING...' : 'POINT AT QR CODE'}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryActionBtn}
          activeOpacity={0.8}
          onPress={() => handleScan('TKB-2026-VIP-001')} // Mock trigger for simulator
          disabled={scanning}
        >
          {scanning ? (
             <Text style={styles.primaryActionTextBlack}>Scanning...</Text>
          ) : (
            <>
              <Zap color="#000" size={18} strokeWidth={2.5} style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionTextBlack}>Scan QR Code</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryActionBtn} activeOpacity={0.8}>
          <Search color={COLORS.textMuted} size={16} style={{ marginRight: 8 }} />
          <Text style={styles.secondaryActionText}>Manual Lookup</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('OfflineQueue')}>
          <CloudOff color={COLORS.textMuted} size={24} />
          <Text style={styles.navItemText}>Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Scanner')}>
          <QrCode color={COLORS.primary} size={24} />
          <Text style={[styles.navItemText, { color: COLORS.primary }]}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
          <SettingsIcon color={COLORS.textMuted} size={24} />
          <Text style={styles.navItemText}>Settings</Text>
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
  viewfinderWrapper: {
    paddingHorizontal: SPACING.lg,
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
    ...StyleSheet.absoluteFillObject,
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
