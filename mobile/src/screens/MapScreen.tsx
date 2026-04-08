import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Circle, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { colors, radii, shadows } from '../theme';
import { MOCK_USERS, MockUser } from '../mocks/mockUsers';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Минимальный delta (≈100 м) — нельзя зумировать ближе */
const MIN_DELTA = 0.0018;
/** Максимальный delta — нельзя отдалять дальше зоны загрузки (~5 км) */
const MAX_DELTA = 0.09;

function StarRating({ value, size = 11 }: { value: number; size?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, color: i <= full ? colors.star : half && i === full + 1 ? colors.warning : colors.starEmpty }}>
          {i <= full ? '★' : half && i === full + 1 ? '⯨' : '☆'}
        </Text>
      ))}
    </View>
  );
}

function UserMarker({ user, onPress }: { user: MockUser; onPress: () => void }) {
  return (
    <Marker
      coordinate={{ latitude: user.latitude, longitude: user.longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={m.markerWrap}>
        <View style={[m.markerBubble, { borderColor: user.avatarColor }]}>
          <View style={[m.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={m.avatarText}>{user.avatarInitials}</Text>
          </View>
        </View>
        <StarRating value={user.compatibility} size={10} />
        <View style={[m.markerTail, { borderTopColor: user.avatarColor }]} />
      </View>
    </Marker>
  );
}

function LocateIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx="12" cy="12" r="3" stroke={colors.accent} strokeWidth="2" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
      <SvgCircle cx="12" cy="12" r="9" stroke={colors.accent} strokeWidth="1.5" strokeDasharray="2 2" />
    </Svg>
  );
}

export function MapScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const mapRef = useRef<MapView>(null);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [visibleUsers, setVisibleUsers] = useState<MockUser[]>(MOCK_USERS);
  const [region, setRegion] = useState<Region | null>(null);

  const getLocation = useCallback(async () => {
    setLocLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setLocLoading(false); return; }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setMyLocation(pos);
    const r: Region = { ...pos, latitudeDelta: MIN_DELTA * 6, longitudeDelta: MIN_DELTA * 6 };
    mapRef.current?.animateToRegion(r, 600);
    setLocLoading(false);
  }, []);

  useEffect(() => { void getLocation(); }, [getLocation]);

  const handleRegionChange = useCallback((r: Region) => {
    // Clamp zoom
    let lat = Math.min(Math.max(r.latitudeDelta, MIN_DELTA), MAX_DELTA);
    let lon = Math.min(Math.max(r.longitudeDelta, MIN_DELTA), MAX_DELTA);
    if (lat !== r.latitudeDelta || lon !== r.longitudeDelta) {
      mapRef.current?.animateToRegion({ ...r, latitudeDelta: lat, longitudeDelta: lon }, 100);
    }
    setRegion({ ...r, latitudeDelta: lat, longitudeDelta: lon });

    // Filter to visible bounds
    const latMin = r.latitude - r.latitudeDelta / 2;
    const latMax = r.latitude + r.latitudeDelta / 2;
    const lonMin = r.longitude - r.longitudeDelta / 2;
    const lonMax = r.longitude + r.longitudeDelta / 2;
    setVisibleUsers(MOCK_USERS.filter(u =>
      u.latitude >= latMin && u.latitude <= latMax &&
      u.longitude >= lonMin && u.longitude <= lonMax
    ));
  }, []);

  const returnToMe = useCallback(() => {
    if (!myLocation) { void getLocation(); return; }
    mapRef.current?.animateToRegion({
      ...myLocation,
      latitudeDelta: MIN_DELTA * 5,
      longitudeDelta: MIN_DELTA * 5,
    }, 500);
  }, [myLocation, getLocation]);

  const initialRegion: Region = {
    latitude: myLocation?.latitude ?? 40.4093,
    longitude: myLocation?.longitude ?? 49.8671,
    latitudeDelta: MIN_DELTA * 30,
    longitudeDelta: MIN_DELTA * 30,
  };

  return (
    <View style={m.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {myLocation && (
          <Circle
            center={myLocation}
            radius={100}
            fillColor="rgba(91,110,245,0.08)"
            strokeColor="rgba(91,110,245,0.25)"
            strokeWidth={1.5}
          />
        )}
        {visibleUsers.map(u => (
          <UserMarker key={u.id} user={u} onPress={() => setSelectedUser(u)} />
        ))}
      </MapView>

      {/* Header */}
      <View style={m.header}>
        <View style={m.headerCard}>
          <Text style={m.headerTitle}>Карта</Text>
          <Text style={m.headerSub}>{visibleUsers.length} чел. рядом</Text>
        </View>
      </View>

      {/* Return to my location */}
      <TouchableOpacity style={m.locBtn} onPress={returnToMe} activeOpacity={0.85}>
        {locLoading
          ? <ActivityIndicator color={colors.accent} size="small" />
          : <LocateIcon size={24} />
        }
      </TouchableOpacity>

      {/* Bottom sheet: selected user */}
      {selectedUser && (
        <Pressable style={m.sheetBackdrop} onPress={() => setSelectedUser(null)}>
          <Pressable style={m.sheet} onStartShouldSetResponder={() => true}>
            <View style={[m.sheetAvatar, { backgroundColor: selectedUser.avatarColor }]}>
              <Text style={m.sheetAvatarText}>{selectedUser.avatarInitials}</Text>
            </View>
            <Text style={m.sheetName}>{selectedUser.displayName}</Text>
            <Text style={m.sheetAge}>{selectedUser.age} лет</Text>
            <StarRating value={selectedUser.compatibility} size={18} />
            <Text style={m.sheetCompat}>{selectedUser.compatibility * 20}% совместимость</Text>
            <View style={m.sheetHobbies}>
              {selectedUser.hobbies.map(h => (
                <View key={h} style={m.hobbyTag}><Text style={m.hobbyText}>{h}</Text></View>
              ))}
            </View>
            <View style={m.sheetActions}>
              <TouchableOpacity
                style={m.sheetBtn}
                onPress={() => { setSelectedUser(null); nav.navigate('Chat', { otherUserId: selectedUser.id, otherName: selectedUser.displayName }); }}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                </Svg>
                <Text style={m.sheetBtnText}>Написать</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.sheetBtn, m.sheetBtnOutline]}
                onPress={() => { setSelectedUser(null); nav.navigate('Call', { targetUserId: selectedUser.id, targetName: selectedUser.displayName, mode: 'audio' }); }}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 11.4a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.05 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke={colors.accent} strokeWidth="2" strokeLinejoin="round" />
                </Svg>
                <Text style={[m.sheetBtnText, { color: colors.accent }]}>Позвонить</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const m = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 13, color: colors.textMuted },
  locBtn: {
    position: 'absolute',
    bottom: 36,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...shadows.card,
  },
  markerWrap: { alignItems: 'center' },
  markerBubble: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 2,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    ...shadows.card,
  },
  sheetAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  sheetAvatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  sheetName: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 2 },
  sheetAge: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  sheetCompat: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 12 },
  sheetHobbies: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  hobbyTag: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  hobbyText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: 12, width: '100%' },
  sheetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 13,
    ...shadows.btn,
  },
  sheetBtnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    ...shadows.card,
  },
  sheetBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
