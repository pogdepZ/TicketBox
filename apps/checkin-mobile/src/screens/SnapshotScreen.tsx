import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Database, DownloadCloud } from 'lucide-react-native';
import { db } from '../services/db';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SnapshotResponse } from '../types';

export default function SnapshotScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    tickets: 0,
    guests: 0,
    lastDownloadedAt: null as string | null,
  });

  const loadStats = async () => {
    try {
      const ticketsResult = await db.getAllAsync<{ count: number }>('SELECT count(*) as count FROM ticket_snapshot');
      const guestsResult = await db.getAllAsync<{ count: number }>('SELECT count(*) as count FROM guest_snapshot');
      const concertResult = await db.getAllAsync<{ cachedAt: string }>('SELECT cachedAt FROM concert_cache LIMIT 1');

      setStats({
        tickets: ticketsResult[0]?.count || 0,
        guests: guestsResult[0]?.count || 0,
        lastDownloadedAt: concertResult.length > 0 ? concertResult[0].cachedAt : null,
      });
    } catch (e) {
      console.error('Error reading SQLite:', e);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleDownloadSnapshot = async () => {
    Alert.alert(
      'Tải dữ liệu Offline',
      'Thao tác này sẽ tải toàn bộ danh sách vé về thiết bị để soát vé offline, ghi đè lên dữ liệu cục bộ hiện có. Bạn có muốn tiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tải về',
          onPress: async () => {
            setLoading(true);
            try {
              const storedConcert = await AsyncStorage.getItem('selected_concert');
              if (!storedConcert) {
                throw new Error('Chưa chọn sự kiện');
              }
              const concertId = JSON.parse(storedConcert).id;
              const res = await apiService.get<SnapshotResponse>(`/checkin/events/${concertId}/snapshot`);
              
              if (!res.success || !res.data) {
                 throw new Error(res.message || 'Không lấy được dữ liệu snapshot');
              }
              
              const { tickets, guests, version, publicKey } = res.data;

              await db.execAsync(`
                DELETE FROM ticket_snapshot;
                DELETE FROM guest_snapshot;
                DELETE FROM concert_cache;
              `);

              const cachedAt = new Date().toISOString();
              const concertObj = JSON.parse(storedConcert);

              await db.runAsync(
                'INSERT INTO concert_cache (id, name, eventDate, venueName, cachedAt, publicKey, version) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [concertId, concertObj.name || '', concertObj.eventDate || '', concertObj.venueName || '', cachedAt, publicKey, version]
              );

              for (const t of tickets) {
                await db.runAsync(
                  'INSERT INTO ticket_snapshot (id, ticketCode, concertId, status, guestName, ticketType, seat, allowedGates, orderRef, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                  [t.id, t.ticketCode, concertId, t.status, t.guestName, t.ticketType, t.seat || null, JSON.stringify(t.allowedGates || []), t.orderRef || null, cachedAt]
                );
              }

              for (const g of guests) {
                await db.runAsync(
                  'INSERT INTO guest_snapshot (id, guestCode, concertId, fullName, email, status, allowedGates, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                  [g.id, g.guestCode, concertId, g.fullName, g.email || '', g.status, JSON.stringify(g.allowedGates || []), cachedAt]
                );
              }

              await loadStats();
              
              const allTickets = await db.getAllAsync('SELECT * FROM ticket_snapshot');
              console.log('--- OFFLINE TICKETS IN SQLITE ---');
              console.log(JSON.stringify(allTickets, null, 2));
              console.log('---------------------------------');

              Alert.alert('Thành công', 'Tải dữ liệu Offline thành công.');
            } catch (e: any) {
              console.error(e);
              Alert.alert('Lỗi', e.message || 'Không lưu được dữ liệu snapshot vào cơ sở dữ liệu cục bộ.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Chưa cập nhật';
    return new Date(isoString).toLocaleString('vi-VN');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={COLORS.textMuted} size={20} />
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.subtitle}>CƠ SỞ DỮ LIỆU</Text>
        <Text style={styles.title}>Dữ liệu Offline (Snapshot)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <Database color={COLORS.primary} size={24} />
          </View>
          <Text style={styles.infoText}>
            Tải xuống bản sao cục bộ của tất cả vé và danh sách khách mời. Điều này giúp bạn soát vé ngay cả khi không có kết nối internet.
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.cardTitle}>Dữ liệu đã lưu</Text>
            <View style={styles.livePill}>
               <Text style={styles.livePillText}>SẴN SÀNG</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Số vé đã lưu:</Text>
            <Text style={styles.statValue}>{stats.tickets}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Khách mời đã lưu:</Text>
            <Text style={styles.statValue}>{stats.guests}</Text>
          </View>
          <View style={[styles.statRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
            <Text style={styles.statLabel}>Cập nhật cuối:</Text>
            <Text style={styles.statValueDate}>{formatDate(stats.lastDownloadedAt)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.downloadButton, loading && styles.downloadButtonDisabled]}
          onPress={handleDownloadSnapshot}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <DownloadCloud color="#000" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.downloadButtonText}>Tải dữ liệu Offline</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  titleContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  infoCard: {
    backgroundColor: COLORS.primary + '14',
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoText: {
    flex: 1,
    color: COLORS.primaryLight,
    fontSize: 13,
    lineHeight: 20,
  },
  statsCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  livePill: {
    backgroundColor: COLORS.success + '1A',
    borderWidth: 1,
    borderColor: COLORS.success + '40',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  livePillText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '50',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  statValueDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  downloadButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  downloadButtonDisabled: {
    opacity: 0.7,
  },
  downloadButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
