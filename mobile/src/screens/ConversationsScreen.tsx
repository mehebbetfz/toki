import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, radii, shadows } from '../theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { MOCK_USERS } from '../mocks/mockUsers';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Conversation {
  userId: string;
  displayName: string;
  avatarInitials: string;
  avatarColor: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
}

const MOCK_CONVERSATIONS: Conversation[] = MOCK_USERS.slice(0, 8).map((u, i) => ({
  userId: u.id,
  displayName: u.displayName,
  avatarInitials: u.avatarInitials,
  avatarColor: u.avatarColor,
  lastMessage: [
    'Привет! Как дела? 😊',
    'Хочу с тобой пообщаться',
    'Ты здесь рядом?',
    '📷 Фото',
    'Круто встретились!',
    '🎁 Подарок получен',
    'До встречи!',
    '🎬 Видео',
  ][i],
  lastTime: ['сейчас', '2 мин', '15 мин', '1 ч', '3 ч', 'вчера', 'вчера', '2 дня'][i],
  unread: [3, 0, 1, 0, 0, 2, 0, 0][i],
  online: [true, false, true, false, true, false, false, true][i],
}));

export function ConversationsScreen() {
  const nav = useNavigation<Nav>();
  const [search, setSearch] = useState('');

  const filtered = search
    ? MOCK_CONVERSATIONS.filter(c => c.displayName.toLowerCase().includes(search.toLowerCase()))
    : MOCK_CONVERSATIONS;

  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={s.item}
      activeOpacity={0.7}
      onPress={() => nav.navigate('Chat', { otherUserId: item.userId, otherName: item.displayName })}
    >
      <View style={s.avatarWrap}>
        <View style={[s.avatar, { backgroundColor: item.avatarColor }]}>
          <Text style={s.avatarText}>{item.avatarInitials}</Text>
        </View>
        {item.online && <View style={s.onlineDot} />}
      </View>
      <View style={s.info}>
        <View style={s.topRow}>
          <Text style={s.name}>{item.displayName}</Text>
          <Text style={[s.time, item.unread > 0 && s.timeUnread]}>{item.lastTime}</Text>
        </View>
        <View style={s.bottomRow}>
          <Text style={[s.lastMsg, item.unread > 0 && s.lastMsgBold]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [nav]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Сообщения</Text>
        <TouchableOpacity style={s.iconBtn}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M11 19H4a1 1 0 01-1-1V8.5L12 3l9 5.5V11" stroke={colors.textMuted} strokeWidth="2" strokeLinejoin="round" />
            <Path d="M17 13v4m0 4v.01M17 13a4 4 0 110 8 4 4 0 010-8z" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 14, zIndex: 1 }}>
          <Circle cx="11" cy="11" r="8" stroke={colors.textMuted} strokeWidth="2" />
          <Path d="M21 21l-4.35-4.35" stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round" />
        </Svg>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по имени..."
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>Нет переписок</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.userId}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  searchWrap: {
    marginHorizontal: 20,
    marginBottom: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingLeft: 40,
    paddingRight: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    ...shadows.card,
  },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 76 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  time: { fontSize: 12, color: colors.textMuted },
  timeUnread: { color: colors.accent, fontWeight: '600' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMsg: { fontSize: 14, color: colors.textMuted, flex: 1 },
  lastMsgBold: { color: colors.text, fontWeight: '500' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16 },
});
