import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../services/db';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';

export default function SnapshotScreen() {
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
      console.error('Lỗi khi đọc SQLite:', e);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleDownloadSnapshot = async () => {
    Alert.alert(
      'Xác nhận tải',
      'Bạn có chắc muốn tải dữ liệu Snapshot cho Concert này? Quá trình này sẽ mất một chút thời gian và xoá dữ liệu cũ.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Tải ngay',
          onPress: async () => {
            setLoading(true);
            try {
              // Xoá dữ liệu cũ
              await db.execAsync(`
                DELETE FROM ticket_snapshot;
                DELETE FROM guest_snapshot;
                DELETE FROM concert_cache;
              `);

              // Thêm dữ liệu giả lập
              const cachedAt = new Date().toISOString();
              const concertId = 'a35ba9c7-89e4-425c-9d00-8016ac4afc3d';

              await db.runAsync(
                'INSERT INTO concert_cache (id, name, eventDate, venueName, cachedAt) VALUES (?, ?, ?, ?, ?)',
                [concertId, 'Sơn Tùng M-TP - Sky Tour 2026', '2026-06-20', 'SVĐ Mỹ Đình', cachedAt]
              );

              // 5 vé mẫu
              for (let i = 1; i <= 5; i++) {
                await db.runAsync(
                  'INSERT INTO ticket_snapshot (id, ticketCode, concertId, status, guestName, ticketType, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [`offline-ticket-${i}`, `TKB-2026-VIP-00${i}`, concertId, 'ACTIVE', `Khách Hàng ${i}`, 'VIP', cachedAt]
                );
              }
              // Thêm 1 vé trùng (đã check-in)
              await db.runAsync(
                'INSERT INTO ticket_snapshot (id, ticketCode, concertId, status, guestName, ticketType, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [`offline-ticket-used`, `TKB-2026-SVIP-002`, concertId, 'USED', `Khách Hàng 2`, 'SVIP', cachedAt]
              );

              // 2 khách mẫu
              await db.runAsync(
                'INSERT INTO guest_snapshot (id, guestCode, concertId, fullName, email, status, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['guest-1', 'GUEST-001', concertId, 'Nguyễn Văn A', 'a@example.com', 'ACTIVE', cachedAt]
              );
              await db.runAsync(
                'INSERT INTO guest_snapshot (id, guestCode, concertId, fullName, email, status, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['guest-2', 'GUEST-002', concertId, 'Trần Thị B', 'b@example.com', 'ACTIVE', cachedAt]
              );

              await loadStats();
              Alert.alert('Thành công', 'Đã tải dữ liệu Snapshot xuống bộ nhớ thiết bị.');
            } catch (e) {
              console.error(e);
              Alert.alert('Lỗi', 'Không thể lưu Snapshot vào DB local.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Chưa từng tải';
    return new Date(isoString).toLocaleString('vi-VN');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Chuẩn bị dữ liệu Offline</Text>
          <Text style={styles.subtitle}>
            Tải dữ liệu danh sách vé và khách mời về máy để có thể tiếp tục check-in kể cả khi mất kết nối mạng.
          </Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Sơn Tùng M-TP - Sky Tour 2026</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Số vé đã tải:</Text>
            <Text style={styles.statValue}>{stats.tickets} vé</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Danh sách khách mời:</Text>
            <Text style={styles.statValue}>{stats.guests} người</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Cập nhật lần cuối:</Text>
            <Text style={styles.statValue}>{formatDate(stats.lastDownloadedAt)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.downloadButton, loading && styles.downloadButtonDisabled]}
          onPress={handleDownloadSnapshot}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.downloadButtonText}>TẢI SNAPSHOT (MOCK)</Text>
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
  scrollContent: {
    padding: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xxl,
  },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
  },
  statsCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  statValue: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  downloadButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonDisabled: {
    opacity: 0.7,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
