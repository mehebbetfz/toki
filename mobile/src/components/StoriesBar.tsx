import { useEffect, useRef } from 'react';
import {
  Animated, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { colors, radii } from '../theme';
import { useStoriesStore } from '../store/useStoriesStore';
import { MOCK_USERS } from '../mocks/mockUsers';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  onOpenStories: (userId: string) => void;
  onAddStory: () => void;
}

const RING_SIZE = 68;
const AVATAR_SIZE = 58;
const RING_OFFSET = (RING_SIZE - AVATAR_SIZE) / 2;

/** Gradient ring for unviewed, grey ring for viewed/empty */
function StoryRing({ hasUnviewed, hasStory }: { hasUnviewed: boolean; hasStory: boolean }) {
  if (!hasStory) {
    return (
      <View style={[s.ring, { borderColor: colors.border, borderStyle: 'dashed' }]} />
    );
  }
  if (!hasUnviewed) {
    return <View style={[s.ring, { borderColor: '#CBD5E1', borderStyle: 'solid' }]} />;
  }
  // Animated gradient ring approximation (RN doesn't support gradient borders natively — use SVG overlay)
  return (
    <View style={s.svgRing}>
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FF6B6B" />
            <Stop offset="50%" stopColor="#A855F7" />
            <Stop offset="100%" stopColor="#3B82F6" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2}
          r={(RING_SIZE - 4) / 2}
          stroke="url(#g)" strokeWidth="3" fill="none"
        />
      </Svg>
    </View>
  );
}

function UserItem({ userId, label, hasStory, isMe, onPress }: {
  userId: string; label: string; hasStory: boolean;
  isMe?: boolean; onPress: () => void;
}) {
  const { hasUnviewed } = useStoriesStore();
  const user = MOCK_USERS.find(u => u.id === userId);
  const initials = label.slice(0, 2).toUpperCase();
  const bgColor = user?.avatarColor ?? colors.accent;
  const unviewed = hasUnviewed(userId);

  return (
    <Pressable style={s.item} onPress={onPress}>
      <View style={s.ringWrapper}>
        <StoryRing hasUnviewed={unviewed} hasStory={hasStory} />
        <View style={[s.avatar, { backgroundColor: bgColor }]}>
          <Text style={s.initials}>{initials}</Text>
          {isMe && (
            <View style={s.addBtn}>
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                <Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              </Svg>
            </View>
          )}
        </View>
      </View>
      <Text style={s.label} numberOfLines={1}>{isMe ? 'Моя' : label.split(' ')[0]}</Text>
    </Pressable>
  );
}

export function StoriesBar({ onOpenStories, onAddStory }: Props) {
  const { getStoriesForUser, purgeExpired } = useStoriesStore();
  const myUser = useAuthStore(s => s.user);
  const myId = myUser?.id ?? 'me';
  const myLabel = myUser?.displayName ?? 'Я';

  useEffect(() => { purgeExpired(); }, []);

  const usersWithStories = MOCK_USERS.filter(u => getStoriesForUser(u.id).length > 0);
  const myStories = getStoriesForUser(myId);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
      style={s.container}
    >
      {/* My story — always first */}
      <UserItem
        userId={myId}
        label={myLabel}
        hasStory={myStories.length > 0}
        isMe
        onPress={myStories.length > 0 ? () => onOpenStories(myId) : onAddStory}
      />
      {usersWithStories.map(u => (
        <UserItem
          key={u.id}
          userId={u.id}
          label={u.displayName}
          hasStory
          onPress={() => onOpenStories(u.id)}
        />
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  row: { paddingHorizontal: 12, paddingVertical: 10, gap: 14 },
  item: { alignItems: 'center', width: RING_SIZE + 4 },
  ringWrapper: { position: 'relative', width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: 2.5 },
  svgRing: { position: 'absolute', width: RING_SIZE, height: RING_SIZE },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.surface },
  initials: { color: '#fff', fontSize: 20, fontWeight: '700' },
  addBtn: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  label: { marginTop: 5, fontSize: 11, color: colors.textMuted, textAlign: 'center', width: RING_SIZE + 4 },
});
