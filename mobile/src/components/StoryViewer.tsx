import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, GestureResponderEvent, Image, Modal,
  Pressable, SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';
import { useStoriesStore, type Story } from '../store/useStoriesStore';
import { MOCK_USERS } from '../mocks/mockUsers';

const { width: SW, height: SH } = Dimensions.get('window');
const STORY_DURATION = 5000; // ms per slide

interface Props {
  userId: string | null; // null = closed
  onClose: () => void;
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 60_000);
  if (d < 1) return 'только что';
  if (d < 60) return `${d} мин`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h} ч`;
  return `${Math.floor(h / 24)} д`;
}

export function StoryViewer({ userId, onClose }: Props) {
  const { getStoriesForUser, markViewed } = useStoriesStore();

  const [stories, setStories] = useState<Story[]>([]);
  const [idx, setIdx] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load / reset stories for this user
  useEffect(() => {
    if (!userId) { setStories([]); setIdx(0); return; }
    const s = getStoriesForUser(userId);
    setStories(s);
    setIdx(0);
  }, [userId]);

  // Progress animation per story
  useEffect(() => {
    if (!userId || stories.length === 0) return;
    progress.setValue(0);
    if (timerRef.current) clearTimeout(timerRef.current);

    const anim = Animated.timing(progress, { toValue: 1, duration: STORY_DURATION, useNativeDriver: false });
    anim.start(({ finished }) => { if (finished) goNext(); });

    markViewed(stories[idx]?.id ?? '');

    return () => { anim.stop(); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [idx, stories, userId]);

  const goNext = useCallback(() => {
    if (idx < stories.length - 1) setIdx(i => i + 1);
    else onClose();
  }, [idx, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (idx > 0) setIdx(i => i - 1);
  }, [idx]);

  const handleTap = useCallback((e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    if (x < SW / 3) goPrev(); else goNext();
  }, [goPrev, goNext]);

  if (!userId || stories.length === 0) return null;

  const story = stories[idx];
  const user = MOCK_USERS.find(u => u.id === userId);
  const initials = (user?.displayName ?? userId).slice(0, 2).toUpperCase();
  const bgColor = user?.avatarColor ?? colors.accent;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.container} onPress={handleTap}>
        {/* Full-screen image */}
        <Image source={{ uri: story.uri }} style={s.image} resizeMode="cover" />

        {/* Overlay gradient (dim at top/bottom) */}
        <View style={s.topGradient} pointerEvents="none" />
        <View style={s.bottomGradient} pointerEvents="none" />

        {/* Progress bars */}
        <SafeAreaView style={s.safeTop} pointerEvents="none">
          <View style={s.progressRow}>
            {stories.map((_, i) => (
              <View key={i} style={s.progressTrack}>
                <Animated.View
                  style={[
                    s.progressFill,
                    {
                      width: i < idx
                        ? '100%'
                        : i === idx
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Header */}
          <View style={s.header}>
            <View style={[s.smallAvatar, { backgroundColor: bgColor }]}>
              <Text style={s.smallInitials}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{user?.displayName ?? userId}</Text>
              <Text style={s.timeAgo}>{timeAgo(story.createdAt)}</Text>
            </View>
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={16}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Story counter */}
        <View style={s.counterWrap} pointerEvents="none">
          <Text style={s.counterTxt}>{idx + 1} / {stories.length}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { position: 'absolute', width: SW, height: SH },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 180, backgroundColor: 'rgba(0,0,0,0.45)' },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(0,0,0,0.35)' },
  safeTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 14, paddingTop: 8 },
  progressTrack: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  smallAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  smallInitials: { color: '#fff', fontSize: 14, fontWeight: '700' },
  userName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  timeAgo: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  closeBtn: { padding: 6 },
  counterWrap: { position: 'absolute', bottom: 40, alignSelf: 'center' },
  counterTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
});
