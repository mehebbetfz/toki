import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, radii } from '../theme';
import { getNearby, NearbyUser, setProximityState } from '../api/client';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useSocialStore } from '../store/useSocialStore';
import { MOCK_USERS } from '../mocks/mockUsers';

function RadarIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={colors.accent} strokeWidth="1.5" strokeDasharray="3 2" />
      <Circle cx="12" cy="12" r="6" stroke={colors.accent} strokeWidth="1.5" />
      <Circle cx="12" cy="12" r="2" fill={colors.accent} />
      <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function PersonIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={colors.accent} strokeWidth="1.8" />
      <Path d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={colors.accent} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function NearbyScreen() {
  const nav = useNavigation<Nav>();
  const social = useSocialStore();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const posRef = useRef<{ lat: number; lon: number } | null>(null);

  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Разрешите доступ к геолокации в настройках');
      return false;
    }
    setLocationGranted(true);
    return true;
  }, []);

  const fetchNearby = useCallback(async (lat: number, lon: number) => {
    try {
      const list = await getNearby(lat, lon);
      setUsers(list);
      setError(null);
    } catch {
      // silently fail on poll
    }
  }, []);

  const activate = useCallback(async () => {
    const ok = await requestLocation();
    if (!ok) return;
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      posRef.current = { lat: latitude, lon: longitude };
      await setProximityState(latitude, longitude, true);
      await fetchNearby(latitude, longitude);
      setActive(true);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [requestLocation, fetchNearby]);

  const deactivate = useCallback(async () => {
    if (posRef.current) {
      try { await setProximityState(posRef.current.lat, posRef.current.lon, false); } catch {}
    }
    setActive(false);
    setUsers([]);
  }, []);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        posRef.current = { lat: latitude, lon: longitude };
        await setProximityState(latitude, longitude, true);
        await fetchNearby(latitude, longitude);
      } catch {}
    }, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, fetchNearby]);

  // Merge API users with mock demo users
  const allUsers: NearbyUser[] = active
    ? [...users, ...MOCK_USERS.slice(0, 6).map(u => ({ id: u.id, displayName: u.displayName, distanceMeters: Math.floor(Math.random() * 90) + 10 }))]
    : [];

  const renderUser = useCallback(({ item }: { item: NearbyUser }) => {
    const isFollowing = social.isFollowing(item.id);
    return (
      <View style={s.card}>
        <View style={s.avatarWrap}>
          <View style={[s.avatar, isFollowing && s.avatarFollowing]}>
            <PersonIcon size={28} />
          </View>
          {isFollowing && (
            <View style={s.followBadge}>
              <Svg width={8} height={8} viewBox="0 0 24 24" fill="none">
                <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          )}
        </View>
        <View style={s.info}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.name}>{item.displayName}</Text>
            {isFollowing && <View style={s.followTag}><Text style={s.followTagText}>подписка</Text></View>}
          </View>
          <Text style={s.tag}>Хочет общаться · {item.distanceMeters ?? '<100'} м</Text>
        </View>
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={() => nav.navigate('Chat', { otherUserId: item.id, otherName: item.displayName })}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={colors.accent} strokeWidth="2" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { marginLeft: 8 }]} onPress={() => nav.navigate('Call', { targetUserId: item.id, targetName: item.displayName, mode: 'audio' })}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 11.4a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.05 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke={colors.accent} strokeWidth="2" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { marginLeft: 8 }]} onPress={() => social.isFollowing(item.id) ? social.unfollow(item.id) : social.follow(item.id)}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              {isFollowing
                ? <Path d="M20 6L9 17l-5-5" stroke={colors.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                : <><Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke={colors.accent} strokeWidth="2" /><Circle cx="9" cy="7" r="4" stroke={colors.accent} strokeWidth="2" /><Path d="M19 8v6M22 11h-6" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" /></>}
            </Svg>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [nav, social]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <RadarIcon size={28} />
        <Text style={s.title}>Рядом</Text>
      </View>

      <View style={s.toggleRow}>
        <Pressable
          style={[s.toggle, active && s.toggleActive]}
          onPress={() => void (active ? deactivate() : activate())}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.text} />
            : <Text style={[s.toggleText, active && s.toggleTextActive]}>
                {active ? '● Поиск включён' : '○ Включить поиск'}
              </Text>
          }
        </Pressable>
      </View>

      {error && <Text style={s.error}>{error}</Text>}

      {active && users.length === 0 && !loading && (
        <View style={s.empty}>
          <RadarIcon size={60} />
          <Text style={s.emptyText}>Никого нет рядом</Text>
          <Text style={s.emptyHint}>Ждём других пользователей в радиусе 100 м...</Text>
        </View>
      )}

      {!active && !loading && (
        <View style={s.empty}>
          <Text style={s.emptyText}>Активируйте поиск</Text>
          <Text style={s.emptyHint}>Нажмите кнопку выше, чтобы начать видеть людей рядом и стать видимым для них.</Text>
        </View>
      )}

      <FlatList
        data={allUsers}
        keyExtractor={(u) => u.id}
        renderItem={renderUser}
        contentContainerStyle={s.list}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  toggleRow: { paddingHorizontal: 20, marginBottom: 12 },
  toggle: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  toggleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  toggleTextActive: { color: colors.text },
  error: { color: colors.danger, paddingHorizontal: 20, marginBottom: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  emptyHint: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  avatarFollowing: { borderWidth: 2, borderColor: colors.accent },
  followBadge: { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  followTag: { backgroundColor: colors.accentSoft, borderRadius: radii.pill, paddingHorizontal: 6, paddingVertical: 1 },
  followTagText: { color: colors.accent, fontSize: 10, fontWeight: '700' },
  info: { flex: 1, marginLeft: 12 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  tag: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
