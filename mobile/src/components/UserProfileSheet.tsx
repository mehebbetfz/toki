import { useCallback, useEffect, useRef } from 'react';
import {
  Animated, Dimensions, Easing, Image, Modal, Pressable,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, radii, shadows } from '../theme';
import { useSocialStore } from '../store/useSocialStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

const { height: SH } = Dimensions.get('window');

export interface ViewableUser {
  id: string;
  displayName: string;
  avatarInitials?: string;
  avatarColor?: string;
  avatarUri?: string;
  age?: number;
  hobbies?: string[];
  compatibility?: number; // 0-5
  posts?: string[];       // preview URIs
}

interface Props {
  user: ViewableUser | null;
  onClose: () => void;
}

function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ fontSize: size, color: i <= full ? colors.star : half && i === full + 1 ? colors.warning : colors.starEmpty }}>
          {i <= full ? '★' : half && i === full + 1 ? '⯨' : '☆'}
        </Text>
      ))}
    </View>
  );
}

const SHEET_H = SH * 0.52;
const POST_W  = (Dimensions.get('window').width - 48 - 12) / 3;

export function UserProfileSheet({ user, onClose }: Props) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const social = useSocialStore();
  const translateY    = useRef(new Animated.Value(SHEET_H)).current;
  const backdropAlpha = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) return;
    Animated.parallel([
      Animated.spring(translateY,    { toValue: 0,    useNativeDriver: true, damping: 22, stiffness: 190 }),
      Animated.timing(backdropAlpha, { toValue: 1,    duration: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();
  }, [user, translateY, backdropAlpha]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY,    { toValue: SHEET_H, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
      Animated.timing(backdropAlpha, { toValue: 0,       duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  }, [translateY, backdropAlpha, onClose]);

  const goToFullProfile = useCallback(() => {
    if (!user) return;
    const payload = JSON.stringify(user);
    Animated.parallel([
      Animated.timing(translateY,    { toValue: SHEET_H, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
      Animated.timing(backdropAlpha, { toValue: 0,       duration: 180, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      setTimeout(() => nav.navigate('UserProfile', { userJson: payload }), 0);
    });
  }, [user, translateY, backdropAlpha, onClose, nav]);

  if (!user) return null;

  const isFollowing  = social.isFollowing(user.id);
  const isFavorite   = social.isFavorite(user.id);
  const initials     = user.avatarInitials ?? user.displayName.slice(0, 2).toUpperCase();
  const bgColor      = user.avatarColor ?? colors.accent;
  const compatibility = user.compatibility;

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: backdropAlpha }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={dismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
        <View style={s.handle} />

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Top: avatar + info — tap opens full profile screen */}
          <TouchableOpacity style={s.topRow} onPress={goToFullProfile} activeOpacity={0.88}>
            <View style={[s.avatar, { backgroundColor: bgColor }]}>
              {user.avatarUri
                ? <Image source={{ uri: user.avatarUri }} style={s.avatarImg} />
                : <Text style={s.avatarTxt}>{initials}</Text>}
              {isFollowing && (
                <View style={s.followBadge}>
                  <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              )}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.name}>{user.displayName}</Text>
              {user.age !== undefined && <Text style={s.age}>{user.age} лет</Text>}
              {compatibility !== undefined && (
                <>
                  <StarRating value={compatibility} />
                  <Text style={s.compatTxt}>{(compatibility * 20).toFixed(0)}% совместимость</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Hobbies */}
          {user.hobbies && user.hobbies.length > 0 && (
            <View style={s.hobbiesRow}>
              {user.hobbies.map(h => (
                <View key={h} style={s.hobbyTag}><Text style={s.hobbyTxt}>{h}</Text></View>
              ))}
            </View>
          )}

          {/* Posts grid */}
          {user.posts && user.posts.length > 0 && (
            <View style={s.postsSection}>
              <Text style={s.sectionLabel}>Посты</Text>
              <View style={s.postsGrid}>
                {user.posts.slice(0, 6).map((uri, i) => (
                  <Image key={i} source={{ uri }} style={s.postThumb} />
                ))}
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => { dismiss(); setTimeout(() => nav.navigate('Chat', { otherUserId: user.id, otherName: user.displayName }), 280); }}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              </Svg>
              <Text style={s.btnPrimaryTxt}>Написать</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btnSecondary, isFollowing && s.btnFollowing]}
              onPress={() => isFollowing ? social.unfollow(user.id) : social.follow(user.id)}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                {isFollowing
                  ? <Path d="M20 6L9 17l-5-5" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <>
                      <Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke={colors.accent} strokeWidth="2" />
                      <Circle cx="9" cy="7" r="4" stroke={colors.accent} strokeWidth="2" />
                      <Path d="M19 8v6M22 11h-6" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
                    </>}
              </Svg>
              <Text style={[s.btnSecondaryTxt, { color: colors.accent }]}>
                {isFollowing ? 'Подписаны' : 'Подписаться'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btnIcon, isFavorite && s.btnIconActive]}
              onPress={() => social.toggleFavorite(user.id)}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"
                  fill={isFavorite ? colors.star : 'none'}
                  stroke={isFavorite ? colors.star : colors.textMuted}
                  strokeWidth="1.8" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,22,35,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_H,
    backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    paddingHorizontal: 24, paddingBottom: 36, ...shadows.card,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  topRow: { flexDirection: 'row', gap: 16, marginBottom: 14, alignItems: 'flex-start' },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarImg: { width: 76, height: 76, borderRadius: 38 },
  avatarTxt: { color: '#fff', fontSize: 28, fontWeight: '700' },
  followBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  age: { fontSize: 13, color: colors.textMuted },
  compatTxt: { fontSize: 12, color: colors.textMuted },
  hobbiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
  hobbyTag: { backgroundColor: colors.accentSoft, borderRadius: radii.pill, paddingHorizontal: 11, paddingVertical: 5 },
  hobbyTxt: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  postsSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  postThumb: { width: POST_W, height: POST_W, borderRadius: radii.sm, backgroundColor: colors.surface2 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: 13, ...shadows.btn },
  btnPrimaryTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.surface, borderRadius: radii.md, paddingVertical: 13, borderWidth: 1.5, borderColor: colors.accent },
  btnFollowing: { backgroundColor: colors.accentSoft },
  btnSecondaryTxt: { fontWeight: '600', fontSize: 15 },
  btnIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
  btnIconActive: { backgroundColor: '#FFF8E6', borderColor: colors.star },
});
