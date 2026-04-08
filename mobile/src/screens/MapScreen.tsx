import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import MapView, { Marker, Circle, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import Svg, { Path, Circle as SvgCircle, Rect } from 'react-native-svg';
import { colors, radii, shadows } from '../theme';
import { MOCK_USERS, MockUser } from '../mocks/mockUsers';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';
import { setWantsToChat } from '../api/client';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const MIN_DELTA = 0.0018;
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

function UserMarker({ user, isFollowing, onPress }: { user: MockUser; isFollowing: boolean; onPress: () => void }) {
  return (
    <Marker coordinate={{ latitude: user.latitude, longitude: user.longitude }} onPress={onPress} anchor={{ x: 0.5, y: 1 }}>
      <View style={m.markerWrap}>
        <View style={[m.markerBubble, { borderColor: isFollowing ? colors.accent : user.avatarColor }]}>
          <View style={[m.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={m.avatarText}>{user.avatarInitials}</Text>
          </View>
          {isFollowing && (
            <View style={m.followPin}>
              <Svg width={8} height={8} viewBox="0 0 24 24" fill="none">
                <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          )}
        </View>
        <StarRating value={user.compatibility} size={10} />
        <View style={[m.markerTail, { borderTopColor: isFollowing ? colors.accent : user.avatarColor }]} />
      </View>
    </Marker>
  );
}

export function MapScreen() {
  const nav = useNavigation<Nav>();
  const social = useSocialStore();
  const mapRef = useRef<MapView>(null);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [visibleUsers, setVisibleUsers] = useState<MockUser[]>(MOCK_USERS);
  const [isActive, setIsActive] = useState(false);
  const [activating, setActivating] = useState(false);

  const getLocation = useCallback(async () => {
    setLocLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setLocLoading(false); return; }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setMyLocation(pos);
    mapRef.current?.animateToRegion({ ...pos, latitudeDelta: MIN_DELTA * 6, longitudeDelta: MIN_DELTA * 6 }, 600);
    setLocLoading(false);
  }, []);

  useEffect(() => { void getLocation(); }, [getLocation]);

  const toggleActive = useCallback(async () => {
    setActivating(true);
    try { await setWantsToChat(!isActive); setIsActive(v => !v); } catch { /* ignore */ }
    setActivating(false);
  }, [isActive]);

  const handleRegionChange = useCallback((r: Region) => {
    let lat = Math.min(Math.max(r.latitudeDelta, MIN_DELTA), MAX_DELTA);
    let lon = Math.min(Math.max(r.longitudeDelta, MIN_DELTA), MAX_DELTA);
    if (lat !== r.latitudeDelta || lon !== r.longitudeDelta)
      mapRef.current?.animateToRegion({ ...r, latitudeDelta: lat, longitudeDelta: lon }, 100);
    const latMin = r.latitude - r.latitudeDelta / 2;
    const latMax = r.latitude + r.latitudeDelta / 2;
    const lonMin = r.longitude - r.longitudeDelta / 2;
    const lonMax = r.longitude + r.longitudeDelta / 2;
    setVisibleUsers(MOCK_USERS.filter(u =>
      u.latitude >= latMin && u.latitude <= latMax &&
      u.longitude >= lonMin && u.longitude <= lonMax,
    ));
  }, []);

  const returnToMe = useCallback(() => {
    if (!myLocation) { void getLocation(); return; }
    mapRef.current?.animateToRegion({ ...myLocation, latitudeDelta: MIN_DELTA * 5, longitudeDelta: MIN_DELTA * 5 }, 500);
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
          <Circle center={myLocation} radius={100} fillColor="rgba(91,110,245,0.08)" strokeColor="rgba(91,110,245,0.25)" strokeWidth={1.5} />
        )}
        {visibleUsers.map(u => (
          <UserMarker key={u.id} user={u} isFollowing={social.isFollowing(u.id)} onPress={() => setSelectedUser(u)} />
        ))}
      </MapView>

      {/* Header */}
      <View style={m.header}>
        <View style={m.headerCard}>
          <Text style={m.headerTitle}>Карта</Text>
          <Text style={m.headerSub}>{visibleUsers.length} чел. рядом</Text>
        </View>
      </View>

      {/* Active toggle — правый верхний угол */}
      <TouchableOpacity
        style={[m.activeBtn, isActive && m.activeBtnOn]}
        onPress={() => void toggleActive()}
        activeOpacity={0.85}
      >
        {activating ? <ActivityIndicator color={isActive ? '#fff' : colors.accent} size="small" /> : (
          <>
            <View style={[m.activeDot, isActive && m.activeDotOn]} />
            <Text style={[m.activeBtnText, isActive && m.activeBtnTextOn]}>
              {isActive ? 'Активен' : 'Стать активным'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Return to my location */}
      <TouchableOpacity style={m.locBtn} onPress={returnToMe} activeOpacity={0.85}>
        {locLoading ? <ActivityIndicator color={colors.accent} size="small" /> : (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <SvgCircle cx="12" cy="12" r="3" stroke={colors.accent} strokeWidth="2" />
            <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
            <SvgCircle cx="12" cy="12" r="9" stroke={colors.accent} strokeWidth="1.5" strokeDasharray="2 2" />
          </Svg>
        )}
      </TouchableOpacity>

      {/* Bottom sheet */}
      {selectedUser && (
        <Pressable style={m.sheetBackdrop} onPress={() => setSelectedUser(null)}>
          <Pressable style={m.sheet} onStartShouldSetResponder={() => true}>
            <View style={[m.sheetAvatar, { backgroundColor: selectedUser.avatarColor }]}>
              <Text style={m.sheetAvatarText}>{selectedUser.avatarInitials}</Text>
              {social.isFollowing(selectedUser.id) && (
                <View style={m.sheetFollowBadge}>
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              )}
            </View>
            <Text style={m.sheetName}>{selectedUser.displayName}</Text>
            <Text style={m.sheetAge}>{selectedUser.age} лет</Text>
            <StarRating value={selectedUser.compatibility} size={18} />
            <Text style={m.sheetCompat}>{(selectedUser.compatibility * 20).toFixed(0)}% совместимость</Text>
            <View style={m.sheetHobbies}>
              {selectedUser.hobbies.map(h => (
                <View key={h} style={m.hobbyTag}><Text style={m.hobbyText}>{h}</Text></View>
              ))}
            </View>

            <View style={m.sheetActions}>
              <TouchableOpacity style={m.sheetBtn} onPress={() => { setSelectedUser(null); nav.navigate('Chat', { otherUserId: selectedUser.id, otherName: selectedUser.displayName }); }}>
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                </Svg>
                <Text style={m.sheetBtnText}>Написать</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.sheetBtn, social.isFollowing(selectedUser.id) ? m.sheetBtnFollowing : m.sheetBtnOutline]}
                onPress={() => social.isFollowing(selectedUser.id) ? social.unfollow(selectedUser.id) : social.follow(selectedUser.id)}
              >
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  {social.isFollowing(selectedUser.id)
                    ? <Path d="M20 6L9 17l-5-5" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    : <><Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke={colors.accent} strokeWidth="2" /><SvgCircle cx="9" cy="7" r="4" stroke={colors.accent} strokeWidth="2" /><Path d="M19 8v6M22 11h-6" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" /></>}
                </Svg>
                <Text style={[m.sheetBtnText, { color: colors.accent }]}>
                  {social.isFollowing(selectedUser.id) ? 'Вы подписаны' : 'Подписаться'}
                </Text>
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
  header: { position: 'absolute', top: 52, left: 16, right: 16, zIndex: 10 },
  headerCard: { backgroundColor: colors.surface, borderRadius: radii.xl, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.card },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 13, color: colors.textMuted },
  activeBtn: {
    position: 'absolute', top: 116, right: 16, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: radii.pill,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1.5, borderColor: colors.border,
    ...shadows.card,
  },
  activeBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted },
  activeDotOn: { backgroundColor: '#fff' },
  activeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  activeBtnTextOn: { color: '#fff' },
  locBtn: { position: 'absolute', bottom: 36, right: 16, width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', zIndex: 10, ...shadows.card },
  markerWrap: { alignItems: 'center' },
  markerBubble: { borderWidth: 2, borderRadius: 24, padding: 2, backgroundColor: colors.surface, ...shadows.card, position: 'relative' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  followPin: { position: 'absolute', top: -4, right: -4, width: 15, height: 15, borderRadius: 7.5, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  markerTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: 24, paddingBottom: 40, alignItems: 'center', ...shadows.card },
  sheetAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative' },
  sheetAvatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  sheetFollowBadge: { position: 'absolute', bottom: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  sheetName: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 2 },
  sheetAge: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  sheetCompat: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 12 },
  sheetHobbies: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  hobbyTag: { backgroundColor: colors.accentSoft, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 5 },
  hobbyText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: 12, width: '100%' },
  sheetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: 13, ...shadows.btn },
  sheetBtnOutline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.accent, ...shadows.card },
  sheetBtnFollowing: { backgroundColor: colors.accentSoft, borderWidth: 1.5, borderColor: colors.accent },
  sheetBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
