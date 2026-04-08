import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radii, shadows } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import type { ViewableUser } from '../components/UserProfileSheet';
import { useSocialStore } from '../store/useSocialStore';
import { MOCK_USERS } from '../mocks/mockUsers';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

const POST_W = (Dimensions.get('window').width - 48 - 12) / 3;

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

function parseUser(route: Props['route']): ViewableUser {
  const { userJson } = route.params;
  try {
    return JSON.parse(userJson) as ViewableUser;
  } catch {
    return { id: 'x', displayName: 'Пользователь' };
  }
}

export function OtherUserProfileScreen({ route, navigation }: Props) {
  const social = useSocialStore();
  const user = parseUser(route);

  const mock = MOCK_USERS.find(u => u.id === user.id);
  const posts = user.posts ?? mock?.posts ?? [];
  const compatibility = user.compatibility ?? mock?.compatibility ?? 0;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.topRow}>
        <View style={[s.avatar, { backgroundColor: user.avatarColor ?? colors.accent }]}>
          {user.avatarUri
            ? <Image source={{ uri: user.avatarUri }} style={s.avatarImg} />
            : <Text style={s.avatarTxt}>{user.avatarInitials ?? user.displayName.slice(0, 2).toUpperCase()}</Text>}
          {social.isFollowing(user.id) && (
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
          <StarRating value={compatibility} />
          <Text style={s.compatTxt}>{(compatibility * 20).toFixed(0)}% совместимость</Text>
        </View>
      </View>

      {user.hobbies && user.hobbies.length > 0 && (
        <View style={s.hobbiesRow}>
          {user.hobbies.map(h => (
            <View key={h} style={s.hobbyTag}><Text style={s.hobbyTxt}>{h}</Text></View>
          ))}
        </View>
      )}

      {posts.length > 0 && (
        <View style={s.postsSection}>
          <Text style={s.sectionLabel}>Посты</Text>
          <View style={s.postsGrid}>
            {posts.slice(0, 9).map((uri, i) => (
              <Image key={i} source={{ uri }} style={s.postThumb} />
            ))}
          </View>
        </View>
      )}

      <View style={s.actionsRow}>
        <TouchableOpacity
          style={s.btnPrimary}
          onPress={() => navigation.navigate('Chat', { otherUserId: user.id, otherName: user.displayName })}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          </Svg>
          <Text style={s.btnPrimaryTxt}>Написать</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btnSecondary, social.isFollowing(user.id) && s.btnFollowing]}
          onPress={() => social.isFollowing(user.id) ? social.unfollow(user.id) : social.follow(user.id)}
        >
          <Text style={[s.btnSecondaryTxt, { color: colors.accent }]}>
            {social.isFollowing(user.id) ? 'Подписаны' : 'Подписаться'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 40 },
  topRow: { flexDirection: 'row', gap: 16, marginBottom: 18 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarTxt: { color: '#fff', fontSize: 32, fontWeight: '700' },
  followBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  age: { fontSize: 13, color: colors.textMuted },
  compatTxt: { fontSize: 12, color: colors.textMuted },
  hobbiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 20 },
  hobbyTag: { backgroundColor: colors.accentSoft, borderRadius: radii.pill, paddingHorizontal: 11, paddingVertical: 5 },
  hobbyTxt: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  postsSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  postThumb: { width: POST_W, height: POST_W, borderRadius: radii.sm, backgroundColor: colors.surface2 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: 14, ...shadows.btn },
  btnPrimaryTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnSecondary: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radii.md, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.accent },
  btnFollowing: { backgroundColor: colors.accentSoft },
  btnSecondaryTxt: { fontWeight: '600', fontSize: 15 },
});
