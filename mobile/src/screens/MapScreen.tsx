import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, Modal,
  Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import MapView, { Marker, Circle, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { colors, radii, shadows } from '../theme';
import { MOCK_USERS, MockUser } from '../mocks/mockUsers';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useSocialStore } from '../store/useSocialStore';
import { getMapStatus, setMapStatusMessage, setProximityState } from '../api/client';
import type { ViewableUser } from '../components/UserProfileSheet';
import { useQuizStore, MOCK_COMPATIBILITY_ANSWERS } from '../store/useQuizStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const MIN_DELTA = 0.0018;
const MAX_DELTA = 0.09;
const { height: SH } = Dimensions.get('window');
const SHEET_H = SH * 0.62; // sheet height

// ─── Star rating ─────────────────────────────────────────────────────────────
function StarRating({ value, size = 11 }: { value: number; size?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ fontSize: size, color: i <= full ? colors.star : half && i === full + 1 ? colors.warning : colors.starEmpty }}>
          {i <= full ? '★' : half && i === full + 1 ? '⯨' : '☆'}
        </Text>
      ))}
    </View>
  );
}

// ─── Map marker ──────────────────────────────────────────────────────────────
function UserMarker({ user, isFollowing, compatibility, onPress }: {
  user: MockUser; isFollowing: boolean; compatibility: number; onPress: () => void;
}) {
  return (
    <Marker coordinate={{ latitude: user.latitude, longitude: user.longitude }} onPress={onPress} anchor={{ x: 0.5, y: 1 }}>
      <View style={m.markerWrap}>
        <View style={[m.markerBubble, { borderColor: isFollowing ? colors.accent : user.avatarColor }]}>
          <View style={[m.markerAvatar, { backgroundColor: user.avatarColor }]}>
            <Text style={m.markerInitials}>{user.avatarInitials}</Text>
          </View>
          {isFollowing && (
            <View style={m.followPin}>
              <Svg width={8} height={8} viewBox="0 0 24 24" fill="none">
                <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          )}
        </View>
        <StarRating value={compatibility} size={10} />
        <View style={[m.markerTail, { borderTopColor: isFollowing ? colors.accent : user.avatarColor }]} />
      </View>
    </Marker>
  );
}

// ─── Animated bottom sheet ────────────────────────────────────────────────────
function UserSheet({ user, onClose, onViewProfile, compatibility, statusMessage }: { user: MockUser; onClose: () => void; onViewProfile: () => void; compatibility: number; statusMessage?: string }) {
  const nav = useNavigation<Nav>();
  const social = useSocialStore();
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // slide in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();
  }, [translateY, backdropOpacity]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SHEET_H, duration: 260, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [translateY, backdropOpacity, onClose]);

  const hasPosts = user.posts.length > 0;

  return (
    <>
      {/* Dimmed backdrop */}
      <Animated.View style={[m.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={dismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[m.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View style={m.handle} />

        {/* Avatar + name */}
        <View style={m.sheetTop}>
          <TouchableOpacity onPress={onViewProfile} activeOpacity={0.82}>
            <View style={[m.sheetAvatar, { backgroundColor: user.avatarColor }]}>
              <Text style={m.sheetAvatarTxt}>{user.avatarInitials}</Text>
              {social.isFollowing(user.id) && (
                <View style={m.sheetFollowBadge}>
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={onViewProfile} activeOpacity={0.8} style={{ flex: 1 }}>
            <Text style={m.sheetName}>{user.displayName}</Text>
            <Text style={m.sheetAge}>{user.age} лет</Text>
            <StarRating value={compatibility} size={15} />
            <Text style={m.sheetCompat}>{(compatibility * 20).toFixed(0)}% совместимость</Text>
          </TouchableOpacity>
        </View>

        {/* Status message from this user */}
        {statusMessage ? (
          <View style={m.statusMsgBubble}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={colors.accent} strokeWidth="2" strokeLinejoin="round" />
            </Svg>
            <Text style={m.statusMsgBubbleTxt}>{statusMessage}</Text>
          </View>
        ) : null}

        {/* Hobbies */}
        <View style={m.hobbiesRow}>
          {user.hobbies.map(h => (
            <View key={h} style={m.hobbyTag}><Text style={m.hobbyTxt}>{h}</Text></View>
          ))}
        </View>

        {/* Posts preview */}
        {hasPosts && (
          <View style={m.postsSection}>
            <Text style={m.postsSectionLabel}>Посты</Text>
            <View style={m.postsRow}>
              {user.posts.slice(0, 3).map((uri, i) => (
                <Image key={i} source={{ uri }} style={m.postThumb} />
              ))}
              {/* Empty slots to keep layout stable */}
              {user.posts.length < 3 && Array.from({ length: 3 - user.posts.length }).map((_, i) => (
                <View key={`empty_${i}`} style={[m.postThumb, m.postThumbEmpty]} />
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={m.actionsRow}>
          <TouchableOpacity
            style={m.actionBtnPrimary}
            onPress={() => { dismiss(); setTimeout(() => nav.navigate('Chat', { otherUserId: user.id, otherName: user.displayName }), 280); }}
          >
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
              <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            </Svg>
            <Text style={m.actionBtnPrimaryTxt}>Написать</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[m.actionBtnSecondary, social.isFollowing(user.id) && m.actionBtnFollowing]}
            onPress={() => social.isFollowing(user.id) ? social.unfollow(user.id) : social.follow(user.id)}
          >
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
              {social.isFollowing(user.id)
                ? <Path d="M20 6L9 17l-5-5" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                : <>
                    <Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke={colors.accent} strokeWidth="2" />
                    <SvgCircle cx="9" cy="7" r="4" stroke={colors.accent} strokeWidth="2" />
                    <Path d="M19 8v6M22 11h-6" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
                  </>}
            </Svg>
            <Text style={[m.actionBtnSecondaryTxt, { color: colors.accent }]}>
              {social.isFollowing(user.id) ? 'Вы подписаны' : 'Подписаться'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
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
  const { getCompatibilityScore } = useQuizStore();

  // Compute quiz-based compatibility for each mock user
  const computedCompatibility = useCallback((userId: string) => {
    const theirAnswers = MOCK_COMPATIBILITY_ANSWERS[userId];
    if (!theirAnswers) return null; // will fall back to static value
    return getCompatibilityScore(theirAnswers);
  }, [getCompatibilityScore]);

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
    try {
      let lat = myLocation?.latitude;
      let lon = myLocation?.longitude;
      if (lat == null || lon == null) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Нужен доступ', 'Разрешите геолокацию, чтобы стать активным на карте.');
          setActivating(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
        setMyLocation({ latitude: lat, longitude: lon });
      }
      await setProximityState(lat, lon, !isActive);
      setIsActive(v => !v);
    } catch {
      Alert.alert('Ошибка', 'Не удалось обновить статус активности.');
    }
    setActivating(false);
  }, [isActive, myLocation]);

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

  // ── My map status message (modal) ─────────────────────────────────────────
  const [myStatusMsg, setMyStatusMsg] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    getMapStatus()
      .then(d => setMyStatusMsg(d.message ?? ''))
      .catch(() => {});
  }, []);

  const openStatusModal = useCallback(() => {
    setStatusDraft(myStatusMsg);
    setStatusModalOpen(true);
  }, [myStatusMsg]);

  const saveStatusMessage = useCallback(async () => {
    const msg = statusDraft.trim();
    setSavingStatus(true);
    try {
      await setMapStatusMessage(msg.length ? msg : null);
      setMyStatusMsg(msg);
      setStatusModalOpen(false);
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить сообщение. Проверьте вход в аккаунт и сервер.');
    }
    setSavingStatus(false);
  }, [statusDraft]);

  return (
    <View style={m.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={{ latitude: myLocation?.latitude ?? 40.4093, longitude: myLocation?.longitude ?? 49.8671, latitudeDelta: MIN_DELTA * 30, longitudeDelta: MIN_DELTA * 30 }}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {myLocation && (
          <Circle center={myLocation} radius={100} fillColor="rgba(91,110,245,0.08)" strokeColor="rgba(91,110,245,0.25)" strokeWidth={1.5} />
        )}
        {visibleUsers.map(u => (
          <UserMarker
            key={u.id}
            user={u}
            isFollowing={social.isFollowing(u.id)}
            compatibility={computedCompatibility(u.id) ?? u.compatibility}
            onPress={() => setSelectedUser(u)}
          />
        ))}
      </MapView>

      {/* Header */}
      <View style={m.header}>
        <View style={m.headerCard}>
          <Text style={m.headerTitle}>Карта</Text>
          <Text style={m.headerSub}>{visibleUsers.length} чел. рядом</Text>
        </View>
      </View>

      {/* ── Location gate: blurred overlay when not active ─────────────────── */}
      {!isActive && (
        <View style={m.locationGate} pointerEvents="box-none">
          <View style={m.gateCard}>
            <Svg width={44} height={44} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={colors.accentSoft} stroke={colors.accent} strokeWidth="1.5" />
              <SvgCircle cx="12" cy="9" r="2.5" stroke={colors.accent} strokeWidth="1.5" />
              <Path d="M8 18h8M7 21h10" stroke={colors.border} strokeWidth="1.5" strokeLinecap="round" />
              <Path d="M10 14.5l2 1.5 2-1.5" stroke={colors.textMuted} strokeWidth="1.2" strokeLinecap="round" />
            </Svg>
            <Text style={m.gateTitle}>Активируйте местоположение</Text>
            <Text style={m.gateSub}>Нажмите кнопку «Стать активным», чтобы видеть людей рядом на карте</Text>
            <TouchableOpacity
              style={m.gateBtn}
              onPress={() => void toggleActive()}
              disabled={activating}
              activeOpacity={0.88}
            >
              {activating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={m.gateBtnTxt}>Стать активным</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Active toggle */}
      <TouchableOpacity style={[m.activeBtn, isActive && m.activeBtnOn]} onPress={() => void toggleActive()} activeOpacity={0.85}>
        {activating
          ? <ActivityIndicator color={isActive ? '#fff' : colors.accent} size="small" />
          : <>
              <View style={[m.activeDot, isActive && m.activeDotOn]} />
              <Text style={[m.activeBtnTxt, isActive && m.activeBtnTxtOn]}>
                {isActive ? 'Активен' : 'Стать активным'}
              </Text>
            </>}
      </TouchableOpacity>

      {/* ── Кнопка сообщения на карте → модалка ввода ─────────────────────────── */}
      {isActive && (
        <TouchableOpacity style={m.statusMsgBar} onPress={openStatusModal} activeOpacity={0.85}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={colors.accent} strokeWidth="2" strokeLinejoin="round" />
          </Svg>
          <Text style={m.statusPillTxt} numberOfLines={2}>
            {myStatusMsg ? myStatusMsg : 'Сообщение для карты — нажмите, чтобы написать'}
          </Text>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke={colors.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      )}

      <Modal visible={statusModalOpen} transparent animationType="fade" onRequestClose={() => setStatusModalOpen(false)}>
        <Pressable style={m.statusModalBackdrop} onPress={() => setStatusModalOpen(false)}>
          <Pressable style={m.statusModalCard} onPress={e => e.stopPropagation()}>
            <Text style={m.statusModalTitle}>Сообщение на карте</Text>
            <Text style={m.statusModalHint}>Его увидят те, кто откроет вашу карточку рядом (до 140 символов).</Text>
            <TextInput
              style={m.statusModalInput}
              value={statusDraft}
              onChangeText={setStatusDraft}
              placeholder="Например: сижу в кафе напротив, напишите!"
              placeholderTextColor={colors.textMuted}
              maxLength={140}
              multiline
            />
            <Text style={m.statusModalCount}>{statusDraft.length}/140</Text>
            <View style={m.statusModalActions}>
              <TouchableOpacity style={m.statusModalCancel} onPress={() => setStatusModalOpen(false)}>
                <Text style={m.statusModalCancelTxt}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.statusModalSave} onPress={() => void saveStatusMessage()} disabled={savingStatus}>
                <Text style={m.statusModalSaveTxt}>{savingStatus ? 'Сохранение…' : 'Сохранить'}</Text>
              </TouchableOpacity>
            </View>
            {myStatusMsg ? (
              <TouchableOpacity
                style={m.statusModalClear}
                onPress={async () => {
                  setSavingStatus(true);
                  try {
                    await setMapStatusMessage(null);
                    setMyStatusMsg('');
                    setStatusDraft('');
                    setStatusModalOpen(false);
                  } catch {
                    Alert.alert('Ошибка', 'Не удалось удалить сообщение');
                  }
                  setSavingStatus(false);
                }}
              >
                <Text style={m.statusModalClearTxt}>Удалить сообщение</Text>
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Return to location */}
      <TouchableOpacity style={m.locBtn} onPress={returnToMe} activeOpacity={0.85}>
        {locLoading
          ? <ActivityIndicator color={colors.accent} size="small" />
          : <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <SvgCircle cx="12" cy="12" r="3" stroke={colors.accent} strokeWidth="2" />
              <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
              <SvgCircle cx="12" cy="12" r="9" stroke={colors.accent} strokeWidth="1.5" strokeDasharray="2 2" />
            </Svg>}
      </TouchableOpacity>

      {/* Animated bottom sheet */}
      {selectedUser && (
        <UserSheet
          key={selectedUser.id}
          user={selectedUser}
          compatibility={computedCompatibility(selectedUser.id) ?? selectedUser.compatibility}
          statusMessage={selectedUser.mapStatusMessage}
          onClose={() => setSelectedUser(null)}
          onViewProfile={() => {
            const u = selectedUser;
            if (!u) return;
            const quiz = computedCompatibility(u.id);
            const payload: ViewableUser = {
              id: u.id,
              displayName: u.displayName,
              avatarInitials: u.avatarInitials,
              avatarColor: u.avatarColor,
              age: u.age,
              hobbies: u.hobbies,
              compatibility: quiz ?? u.compatibility,
              posts: u.posts,
            };
            setSelectedUser(null);
            setTimeout(() => nav.navigate('UserProfile', { userJson: JSON.stringify(payload) }), 50);
          }}
        />
      )}
    </View>
  );
}

const POST_THUMB = (Dimensions.get('window').width - 48 - 16) / 3;

const m = StyleSheet.create({
  container: { flex: 1 },

  // header
  header: { position: 'absolute', top: 52, left: 16, right: 16, zIndex: 10 },
  headerCard: { backgroundColor: colors.surface, borderRadius: radii.xl, paddingHorizontal: 20, paddingVertical: 12, ...shadows.card },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 13, color: colors.textMuted },

  // active btn
  activeBtn: { position: 'absolute', top: 116, right: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: colors.border, ...shadows.card },
  activeBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted },
  activeDotOn: { backgroundColor: colors.success },
  activeBtnTxt: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  activeBtnTxtOn: { color: '#fff' },

  // locate btn
  locBtn: { position: 'absolute', bottom: 36, right: 16, width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', zIndex: 10, ...shadows.card },

  // marker
  markerWrap: { alignItems: 'center' },
  markerBubble: { borderWidth: 2, borderRadius: 24, padding: 2, backgroundColor: colors.surface, ...shadows.card, position: 'relative' },
  markerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  markerInitials: { color: '#fff', fontWeight: '700', fontSize: 13 },
  followPin: { position: 'absolute', top: -4, right: -4, width: 15, height: 15, borderRadius: 7.5, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  markerTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },

  // sheet
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,22,35,0.45)', zIndex: 20 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_H, backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: 24, paddingBottom: 32, zIndex: 30, ...shadows.card },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 18 },

  sheetTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 14 },
  sheetAvatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  sheetAvatarTxt: { color: '#fff', fontSize: 24, fontWeight: '700' },
  sheetFollowBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  sheetName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 2 },
  sheetAge: { fontSize: 13, color: colors.textMuted, marginBottom: 5 },
  sheetCompat: { color: colors.textMuted, fontSize: 12, marginTop: 3 },

  hobbiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
  hobbyTag: { backgroundColor: colors.accentSoft, borderRadius: radii.pill, paddingHorizontal: 11, paddingVertical: 5 },
  hobbyTxt: { color: colors.accent, fontSize: 12, fontWeight: '600' },

  // posts preview
  postsSection: { marginBottom: 18 },
  postsSectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  postsRow: { flexDirection: 'row', gap: 6 },
  postThumb: { width: POST_THUMB, height: POST_THUMB, borderRadius: radii.md, backgroundColor: colors.surface2 },
  postThumbEmpty: { opacity: 0.3 },

  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: 13, ...shadows.btn },
  actionBtnPrimaryTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  actionBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.md, paddingVertical: 13, borderWidth: 1.5, borderColor: colors.accent, ...shadows.card },
  actionBtnFollowing: { backgroundColor: colors.accentSoft },
  actionBtnSecondaryTxt: { fontWeight: '600', fontSize: 15 },

  // Location gate
  locationGate: {
    ...StyleSheet.absoluteFillObject, zIndex: 15,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  gateCard: {
    backgroundColor: colors.surface, borderRadius: radii.xl, padding: 28,
    alignItems: 'center', maxWidth: 300, ...shadows.card,
  },
  gateTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },
  gateSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  gateBtn: {
    marginTop: 4, backgroundColor: colors.accent, borderRadius: radii.md,
    paddingHorizontal: 28, paddingVertical: 12, minWidth: 200, alignItems: 'center', ...shadows.btn,
  },
  gateBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // My status message — кнопка открывает модалку
  statusMsgBar: {
    position: 'absolute', bottom: 104, left: 16, right: 70, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: radii.lg,
    paddingHorizontal: 14, paddingVertical: 12, ...shadows.card,
    borderWidth: 1, borderColor: colors.border,
  },
  statusPillTxt: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },

  statusModalBackdrop: { flex: 1, backgroundColor: 'rgba(15,22,35,0.5)', justifyContent: 'center', padding: 24 },
  statusModalCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 20, ...shadows.card },
  statusModalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  statusModalHint: { fontSize: 13, color: colors.textMuted, marginBottom: 14, lineHeight: 18 },
  statusModalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
    minHeight: 100, textAlignVertical: 'top',
  },
  statusModalCount: { alignSelf: 'flex-end', fontSize: 11, color: colors.textMuted, marginTop: 4 },
  statusModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 18 },
  statusModalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  statusModalCancelTxt: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  statusModalSave: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: 10, paddingHorizontal: 22 },
  statusModalSaveTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  statusModalClear: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  statusModalClearTxt: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'underline' },

  // Status message bubble in user sheet
  statusMsgBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accentSoft, borderRadius: radii.md,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
  },
  statusMsgBubbleTxt: { flex: 1, fontSize: 14, color: colors.accent, fontStyle: 'italic' },
});
