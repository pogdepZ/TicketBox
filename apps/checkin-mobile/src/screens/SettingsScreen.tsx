import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, LogOut, Database, User, Bell, Smartphone, Cloud, Info } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants/theme';
import type { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [userName, setUserName] = useState('Staff Member');
  const [userRole, setUserRole] = useState('Gate Operator');

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem('auth_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserName(user.fullName || user.email || 'Staff Member');
          setUserRole(user.role || 'Gate Operator');
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const debugStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const result = await AsyncStorage.multiGet(keys);
      console.log('--- ASYNC STORAGE DUMP ---');
      result.forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });
      console.log('--------------------------');
      Alert.alert('Storage Dumped', 'Check terminal logs.');
    } catch (error) {
      console.error('Error reading AsyncStorage:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={COLORS.textMuted} size={20} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.subtitle}>CONFIGURATION</Text>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <User color={COLORS.primary} size={20} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.userRole}>{userRole}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
              <LogOut color={COLORS.error} size={18} style={{ marginRight: 12 }} />
              <Text style={styles.actionTextError}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <SettingToggle 
              icon={<Bell color={COLORS.textMuted} size={18} />} 
              label="Push Notifications" 
              value={notifications} 
              onValueChange={setNotifications} 
            />
            <View style={styles.divider} />
            <SettingToggle 
              icon={<Smartphone color={COLORS.textMuted} size={18} />} 
              label="Haptic Feedback" 
              value={haptics} 
              onValueChange={setHaptics} 
            />
            <View style={styles.divider} />
            <SettingToggle 
              icon={<Cloud color={COLORS.textMuted} size={18} />} 
              label="Background Auto-Sync" 
              value={autoSync} 
              onValueChange={setAutoSync} 
            />
          </View>
        </View>

        {/* Database / Debug */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Data</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Snapshot')}>
              <Database color={COLORS.info} size={18} style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.actionText}>Download Offline Snapshot</Text>
                <Text style={styles.actionSubtext}>Update local database for offline scanning</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={debugStorage}>
              <Info color={COLORS.textMuted} size={18} style={{ marginRight: 12 }} />
              <Text style={styles.actionText}>Dump Storage (Debug)</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function SettingToggle({ icon, label, value, onValueChange }: { icon: React.ReactNode, label: string, value: boolean, onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.settingToggleRow}>
      <View style={styles.settingToggleLeft}>
        {icon}
        <Text style={styles.settingToggleLabel}>{label}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
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
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 46, // align with text
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '1A',
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  userRole: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionTextError: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '500',
  },
  actionText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  actionSubtext: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingToggleLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
});
