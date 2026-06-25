import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ChevronLeft, CheckCircle2, AlertTriangle, XCircle, Clock, ChevronRight, RotateCcw } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import type { RootStackParamList, ScanStatus } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Result'>;
type ResultRouteProp = RouteProp<RootStackParamList, 'Result'>;

const STATUS_CONFIG: Record<ScanStatus, { label: string; sublabel: string; color: string; bg: string; border: string; icon: any }> = {
  SUCCESS: {
    label: 'VALID',
    sublabel: 'Allow entry',
    color: COLORS.success,
    bg: COLORS.success + '1A', // 10% opacity
    border: COLORS.success + '40', // 25% opacity
    icon: CheckCircle2,
  },
  TEMP_ACCEPTED: {
    label: 'TEMP ACCEPTED',
    sublabel: 'Allow entry (Offline)',
    color: COLORS.success,
    bg: COLORS.success + '1A',
    border: COLORS.success + '40',
    icon: CheckCircle2,
  },
  DUPLICATE: {
    label: 'ALREADY USED',
    sublabel: 'Deny entry — already scanned',
    color: COLORS.warning,
    bg: COLORS.warning + '1A',
    border: COLORS.warning + '40',
    icon: AlertTriangle,
  },
  NOT_FOUND: {
    label: 'INVALID',
    sublabel: 'Deny entry — not recognised',
    color: COLORS.error,
    bg: COLORS.error + '1A',
    border: COLORS.error + '40',
    icon: XCircle,
  },
  WRONG_EVENT: {
    label: 'INVALID',
    sublabel: 'Deny entry — wrong event',
    color: COLORS.error,
    bg: COLORS.error + '1A',
    border: COLORS.error + '40',
    icon: XCircle,
  },
  ACCEPTED_GUEST: {
    label: 'GUEST ALLOWED',
    sublabel: 'Allow entry (Guest List)',
    color: COLORS.success,
    bg: COLORS.success + '1A',
    border: COLORS.success + '40',
    icon: CheckCircle2,
  },
  DUPLICATE_GUEST: {
    label: 'GUEST USED',
    sublabel: 'Deny entry — guest already checked in',
    color: COLORS.warning,
    bg: COLORS.warning + '1A',
    border: COLORS.warning + '40',
    icon: AlertTriangle,
  },
  INVALID_GUEST: {
    label: 'INVALID GUEST',
    sublabel: 'Deny entry — not on guest list',
    color: COLORS.error,
    bg: COLORS.error + '1A',
    border: COLORS.error + '40',
    icon: XCircle,
  },
};

// Helper for Mock Avatar
const getInitials = (name: string) => {
  if (!name || name === '---' || name === 'Unknown') return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = ['#7c3aed', '#0891b2', '#db2777', '#ea580c', '#16a34a'];
  if (!name || name === '---' || name === 'Unknown') return '#374151';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function ResultScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResultRouteProp>();
  const { ticket, isOffline } = route.params;

  const s = STATUS_CONFIG[ticket.status as ScanStatus] || STATUS_CONFIG.NOT_FOUND;
  const Icon = s.icon;
  const isInvalid = ticket.status === 'NOT_FOUND' || ticket.status === 'WRONG_EVENT';
  const isUsed = ticket.status === 'DUPLICATE';
  const checkinTime = ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

  const photoInitials = getInitials(ticket.guestName);
  const photoColor = getAvatarColor(ticket.guestName);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color={COLORS.textMuted} size={20} />
            <Text style={styles.backText}>Scanner</Text>
          </TouchableOpacity>
        </View>

        {/* Offline Badge */}
        {isOffline && (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineNoticeText}>Recorded Offline. Will sync when online.</Text>
          </View>
        )}

        {/* Giant status indicator */}
        <View style={[styles.statusCard, { backgroundColor: s.bg, borderColor: s.border }]}>
          <View style={styles.statusInner}>
            <View style={[styles.statusIconBox, { backgroundColor: s.bg, borderColor: s.border }]}>
              <Icon color={s.color} size={32} />
            </View>
            <View style={styles.statusTextCol}>
              <Text style={[styles.statusLabel, { color: s.color }]}>{s.label}</Text>
              <Text style={styles.statusSublabel}>{s.sublabel}</Text>
            </View>
          </View>

          {isUsed && checkinTime ? (
            <View style={[styles.usedTimeRow, { borderTopColor: s.border }]}>
              <Clock color={s.color} size={14} />
              <Text style={styles.usedTimeText}>
                Previously checked in at <Text style={[styles.usedTimeBold, { color: s.color }]}>{checkinTime}</Text>
              </Text>
            </View>
          ) : null}
        </View>

        {/* Attendee card (not for invalid) */}
        {!isInvalid && (
          <TouchableOpacity 
            style={styles.attendeeCard} 
            activeOpacity={0.7}
            // In a full app, this would navigate to a detailed Attendee info screen
            // onPress={() => navigation.navigate('AttendeeDetails', { ticket })}
          >
            <View style={[styles.avatar, { backgroundColor: photoColor }]}>
              <Text style={styles.avatarText}>{photoInitials}</Text>
            </View>
            <View style={styles.attendeeInfo}>
              <Text style={styles.attendeeName} numberOfLines={1}>{ticket.guestName}</Text>
              <Text style={styles.attendeeType}>{ticket.ticketType}</Text>
            </View>
            <View style={styles.seatInfo}>
              <Text style={styles.seatLabel}>Seat</Text>
              <Text style={styles.seatValue}>{ticket.seat || 'N/A'}</Text> 
            </View>
            <ChevronRight color={COLORS.textMuted} size={16} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}

        {/* Ticket details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsHeaderText}>Ticket Details</Text>
          </View>
          <View style={styles.detailsList}>
            <DetailRow label="Ticket ID" value={ticket.ticketCode} mono />
            <DetailRow label="Order" value="ORD-2026-9941" mono />
            <DetailRow label="Event" value={ticket.concertName} />
            <DetailRow label="Venue" value="The Warehouse" />
          </View>
        </View>

        {/* Invalid notice */}
        {isInvalid && (
          <View style={styles.invalidNotice}>
            <Text style={styles.invalidNoticeText}>
              This ticket was not found in the system. It may be counterfeit, expired, or belong to a different event. Do not allow entry and flag for supervisor review.
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.scanNextBtn}
          onPress={() => navigation.navigate('Scanner')}
          activeOpacity={0.8}
        >
          <RotateCcw color={COLORS.text} size={18} style={{ marginRight: 8 }} />
          <Text style={styles.scanNextBtnText}>Scan Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.detailMono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
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
  offlineNotice: {
    backgroundColor: COLORS.warning + '1A',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  offlineNoticeText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: SPACING.lg,
  },
  statusInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusTextCol: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  statusSublabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  usedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  usedTimeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: 8,
  },
  usedTimeBold: {
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  attendeeCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  attendeeType: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  seatInfo: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  seatLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  seatValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  detailsCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  detailsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailsHeaderText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  detailsList: {
    paddingBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '50',
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
  },
  detailMono: {
    fontFamily: 'monospace',
  },
  invalidNotice: {
    backgroundColor: COLORS.error + '1A',
    borderWidth: 1,
    borderColor: COLORS.error + '33',
    borderRadius: 16,
    padding: 16,
    marginBottom: SPACING.md,
  },
  invalidNoticeText: {
    color: COLORS.error,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
  bottomActions: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    paddingTop: SPACING.md,
  },
  scanNextBtn: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanNextBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
