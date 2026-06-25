import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, MapPin, ChevronRight, LogOut } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import { apiService } from '../services/api';
import type { RootStackParamList, Concert } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EventSelector'>;

export default function EventSelectorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConcerts();
  }, []);

  const fetchConcerts = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<Concert[]>('/checkin/concerts');
      if (response.success && response.data) {
        setConcerts(response.data);
      } else {
        Alert.alert('Error', response.message || 'Failed to load events');
      }
    } catch (error) {
      Alert.alert('Error', 'Cannot connect to server. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConcert = async (concert: Concert) => {
    try {
      await AsyncStorage.setItem('selected_concert', JSON.stringify(concert));
      navigation.reset({ index: 0, routes: [{ name: 'Scanner' }] });
    } catch (error) {
      Alert.alert('Error', 'Failed to save selected event');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['auth_token', 'auth_user', 'selected_concert']);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const renderConcertCard = ({ item }: { item: Concert }) => {
    const formattedDate = new Date(item.eventDate).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handleSelectConcert(item)}
      >
        <View style={styles.cardContent}>
          <Text style={styles.concertName}>{item.name}</Text>
          
          <View style={styles.infoRow}>
            <Calendar size={16} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{formattedDate}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <MapPin size={16} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{item.venueName}</Text>
          </View>
        </View>
        <ChevronRight size={24} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Select Event</Text>
          <Text style={styles.headerSubtitle}>Choose the event you are assigned to</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : concerts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No active events found.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchConcerts}>
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={concerts}
          keyExtractor={(item) => item.id}
          renderItem={renderConcertCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  logoutBtn: {
    padding: SPACING.sm,
    backgroundColor: COLORS.error + '1A',
    borderRadius: BORDER_RADIUS.full,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: SPACING.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardContent: {
    flex: 1,
    marginRight: SPACING.md,
  },
  concertName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  retryBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary + '1A',
    borderRadius: BORDER_RADIUS.md,
  },
  retryText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
