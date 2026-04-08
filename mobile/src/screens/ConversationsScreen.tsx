import { useCallback, useState } from 'react';
import {
  ActionSheetIOS, Alert, FlatList, Platform, SafeAreaView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors, radii, shadows } from '../theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { MOCK_USERS } from '../mocks/mockUsers';
import { useSocialStore } from '../store/useSocialStore';
import { useSignalR } from '../hooks/useSignalR';
import { StoriesBar } from '../components/StoriesBar';
import { StoryViewer } from '../components/StoryViewer';
import * as ImagePicker from 'expo-image-picker';
import { useStoriesStore } from '../store/useStoriesStore';
import { useAuthStore } from '../store/useAuthStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type VisibilityFilter = 'all' | 'inbox' | 'archived';

interface Conversation {
  userId: string;
  displayName: string;
  avatarInitials: string;
  avatarColor: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
  typing?: boolean;
  archived?: boolean;
  blocked?: boolean;
  isGroup?: boolean;
  groupName?: string;
}

const BASE_CONVERSATIONS: Conversation[] = MOCK_USERS.slice(0, 8).map((u, i) => ({
  userId: u.id,
  displayName: u.displayName,
  avatarInitials: u.avatarInitials,
  avatarColor: u.avatarColor,
  lastMessage: ['Привет! Как дела? 😊', 'Хочу с тобой познакомиться', 'Ты здесь рядом?', '📷 Фото', 'Круто встретились!', '🎁 Подарок получен', 'До встречи!', '🎬 Видео'][i],
  lastTime: ['сейчас', '2 мин', '15 мин', '1 ч', '3 ч', 'вчера', 'вчера', '2 дня'][i],
  unread: [3, 0, 1, 0, 0, 2, 0, 0][i],
  online: [true, false, true, false, true, false, false, true][i],
  archived: false,
  blocked: false,
}));

const GROUP_CONV: Conversation = {
  userId: 'group_1',
  displayName: 'Toki Meetup Group',
  avatarInitials: 'TG',
  avatarColor: colors.teal,
  lastMessage: 'Олег: Встречаемся в 7?',
  lastTime: '10 мин',
  unread: 5,
  online: false,
  isGroup: true,
  groupName: 'Toki Meetup Group',
  archived: false,
  blocked: false,
};

export function ConversationsScreen() {
  const nav = useNavigation<Nav>();
  const social = useSocialStore();
  const { connRef } = useSignalR('chat');
  const myUser = useAuthStore(s => s.user);
  const { addStory } = useStoriesStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VisibilityFilter>('inbox');
  const [convs, setConvs] = useState<Conversation[]>([GROUP_CONV, ...BASE_CONVERSATIONS]);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const [viewingStoriesUserId, setViewingStoriesUserId] = useState<string | null>(null);

  const handleAddStory = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа', 'Разрешите доступ к галерее'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      addStory(asset.uri, asset.type === 'video' ? 'video' : 'image', myUser?.id ?? 'me');
      setViewingStoriesUserId(myUser?.id ?? 'me');
    }
  }, [addStory, myUser]);

  const archive = useCallback((userId: string) => {
    setConvs(prev => prev.map(c => c.userId === userId ? { ...c, archived: !c.archived } : c));
  }, []);
  const block = useCallback((userId: string) => {
    Alert.alert('Блокировка', 'Заблокировать этого пользователя?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Заблокировать', style: 'destructive', onPress: () => setConvs(prev => prev.map(c => c.userId === userId ? { ...c, blocked: true } : c)) },
    ]);
  }, []);

  const longPress = useCallback((item: Conversation) => {
    const actions = item.archived
      ? ['Разархивировать', 'Заблокировать', 'Отмена']
      : ['Архивировать', 'Заблокировать', 'Отмена'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: actions, destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        i => { if (i === 0) archive(item.userId); if (i === 1) block(item.userId); }
      );
    } else {
      Alert.alert(item.displayName, '', [
        { text: item.archived ? 'Разархивировать' : 'Архивировать', onPress: () => archive(item.userId) },
        { text: 'Заблокировать', style: 'destructive', onPress: () => block(item.userId) },
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  }, [archive, block]);

  const createGroup = useCallback(() => {
    Alert.prompt(
      'Новая группа',
      'Введите название группы:',
      (name) => {
        if (!name?.trim()) return;
        const newGroup: Conversation = {
          userId: `group_${Date.now()}`,
          displayName: name.trim(),
          avatarInitials: name.trim().slice(0, 2).toUpperCase(),
          avatarColor: colors.accent,
          lastMessage: 'Группа создана',
          lastTime: 'сейчас',
          unread: 0,
          online: false,
          isGroup: true,
          groupName: name.trim(),
          archived: false, blocked: false,
        };
        setConvs(prev => [newGroup, ...prev]);
      },
      'plain-text',
    );
  }, []);

  const filtered = convs.filter(c => {
    if (c.blocked) return false;
    if (filter === 'archived') return c.archived;
    if (filter === 'inbox') return !c.archived;
    return true;
  }).filter(c => !search || c.displayName.toLowerCase().includes(search.toLowerCase()));

  const renderItem = useCallback(({ item }: { item: Conversation }) => {
    const isFollowing = !item.isGroup && social.isFollowing(item.userId);
    const t = typingMap[item.userId];
    return (
      <TouchableOpacity
        style={[s.item, item.archived && s.itemArchived]}
        activeOpacity={0.7}
        onPress={() => nav.navigate('Chat', { otherUserId: item.userId, otherName: item.displayName })}
        onLongPress={() => longPress(item)}
      >
        <View style={s.avatarWrap}>
          <View style={[s.avatar, { backgroundColor: item.avatarColor }]}>
            {item.isGroup
              ? <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  <Circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2" />
                  <Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </Svg>
              : <Text style={s.avatarText}>{item.avatarInitials}</Text>}
          </View>
          {item.online && <View style={s.onlineDot} />}
          {isFollowing && (
            <View style={s.followBadge}>
              <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
                <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          )}
        </View>

        <View style={s.info}>
          <View style={s.topRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
              {item.isGroup && (
                <View style={s.groupTag}><Text style={s.groupTagText}>группа</Text></View>
              )}
            </View>
            <Text style={[s.time, item.unread > 0 && s.timeUnread]}>{item.lastTime}</Text>
          </View>
          <View style={s.bottomRow}>
            {t
              ? <Text style={s.typingText}>печатает<Text style={{ fontWeight: '700' }}>...</Text></Text>
              : <Text style={[s.lastMsg, item.unread > 0 && s.lastMsgBold]} numberOfLines={1}>{item.lastMessage}</Text>}
            {item.unread > 0 && (
              <View style={s.badge}><Text style={s.badgeText}>{item.unread}</Text></View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [nav, longPress, social, typingMap]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Сообщения</Text>
        <TouchableOpacity style={s.iconBtn} onPress={createGroup}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M12 5v14M5 12h14" stroke={colors.accent} strokeWidth="2.2" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 13, zIndex: 1 }}>
          <Circle cx="11" cy="11" r="8" stroke={colors.textMuted} strokeWidth="2" />
          <Path d="M21 21l-4.35-4.35" stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round" />
        </Svg>
        <TextInput style={s.search} value={search} onChangeText={setSearch} placeholder="Поиск..." placeholderTextColor={colors.textMuted} />
      </View>

      <View style={s.tabs}>
        {(['inbox', 'archived'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, filter === tab && s.tabActive]} onPress={() => setFilter(tab)}>
            <Text style={[s.tabText, filter === tab && s.tabTextActive]}>
              {tab === 'inbox' ? 'Входящие' : 'Архив'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stories strip */}
      {filter === 'inbox' && (
        <StoriesBar
          onOpenStories={setViewingStoriesUserId}
          onAddStory={handleAddStory}
        />
      )}

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>{filter === 'archived' ? 'Архив пуст' : 'Нет переписок'}</Text>
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

      {/* Story fullscreen viewer */}
      <StoryViewer userId={viewingStoriesUserId} onClose={() => setViewingStoriesUserId(null)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { marginHorizontal: 20, marginBottom: 10, position: 'relative', justifyContent: 'center' },
  search: { backgroundColor: colors.surface, borderRadius: radii.md, paddingLeft: 38, paddingRight: 14, paddingVertical: 10, fontSize: 15, color: colors.text, ...shadows.card },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  tab: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.surface2 },
  tabActive: { backgroundColor: colors.accent },
  tabText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 0, paddingBottom: 24 },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 82 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 20, backgroundColor: colors.surface },
  itemArchived: { opacity: 0.55 },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface },
  followBadge: { position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  groupTag: { backgroundColor: colors.teal, borderRadius: radii.pill, paddingHorizontal: 6, paddingVertical: 1 },
  groupTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1, marginRight: 4 },
  time: { fontSize: 12, color: colors.textMuted },
  timeUnread: { color: colors.accent, fontWeight: '600' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMsg: { fontSize: 14, color: colors.textMuted, flex: 1 },
  lastMsgBold: { color: colors.text, fontWeight: '500' },
  typingText: { fontSize: 14, color: colors.accent, fontStyle: 'italic', flex: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16 },
});
