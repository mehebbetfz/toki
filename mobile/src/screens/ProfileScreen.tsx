import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS, ActivityIndicator, Alert, Dimensions, FlatList, Image,
  Modal, Platform, Pressable, SafeAreaView, StyleSheet, Switch, Text,
  TextInput, TouchableOpacity, View, Share,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { colors, radii, shadows } from '../theme';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';

const { width: SW } = Dimensions.get('window');
const CELL_SIZE = (SW - 3) / 3; // 3 columns, 1px gaps
const PAGE_SIZE = 9;             // load 9 posts per page (3 rows)

// ─── Post pool (30 items, simulates server data) ─────────────────────────────
type Post = {
  id: string;
  uri: string;
  caption: string;
  likes: number;
  pinned: boolean;
};

const ALL_POSTS: Post[] = Array.from({ length: 30 }, (_, i) => ({
  id: `p${i + 1}`,
  uri: `https://picsum.photos/seed/toki${i + 1}/600/600`,
  pinned: false,
  caption: [
    'Отличный день! ☀️', 'Природа и спокойствие 🌿', 'Кофе и код ☕',
    'Вечерний Баку 🌃', '', 'Горы зовут 🏔', 'Закат у моря 🌊',
    'Новый проект 💡', 'Тренировка ✅', 'Встреча с друзьями 🎉',
    'Весенний парк 🌸', 'Уютный вечер 🕯️', 'Книги и кофе 📚',
    'Прогулка по городу 🏙️', 'Горный воздух ⛰️', 'Долгожданный отпуск 🏖️',
    '', 'Рассвет над городом 🌅', 'Домашний уют 🏡', 'Спорт — это жизнь 💪',
    'Первый снег ❄️', 'Дождливый день 🌧️', 'Летний пикник 🧺',
    'Ночная Москва 🌃', '', 'Цветущий сад 🌺', 'Кулинарный эксперимент 🍳',
    'Встреча с природой 🦋', 'Арт-выставка 🎨', 'Новые горизонты 🌍',
  ][i] ?? '',
  likes: Math.floor(Math.random() * 50) + 3,
})) as Post[];

// ─── Mock gifts ──────────────────────────────────────────────────────────────
const MOCK_GIFTS = [
  { id: '1', name: 'Роза',   emoji: '🌹', count: 3 },
  { id: '2', name: 'Алмаз',  emoji: '💎', count: 1 },
  { id: '3', name: 'Огонь',  emoji: '🔥', count: 5 },
  { id: '4', name: 'Звезда', emoji: '⭐', count: 2 },
  { id: '5', name: 'Ракета', emoji: '🚀', count: 1 },
];

interface ProfileField { key: string; label: string; value: string; visible: boolean; }
const DEFAULT_FIELDS: ProfileField[] = [
  { key: 'age',          label: 'Возраст',    value: '25',          visible: true  },
  { key: 'city',         label: 'Город',      value: 'Баку',        visible: true  },
  { key: 'occupation',   label: 'Работа',     value: 'Разработчик', visible: true  },
  { key: 'education',    label: 'Образование',value: 'БГТУ',        visible: false },
  { key: 'languages',    label: 'Языки',      value: 'RU, EN, AZ',  visible: true  },
  { key: 'relationship', label: 'Статус',     value: 'Свободен',    visible: false },
];
const HOBBIES = ['Музыка','Кино','Спорт','Путешествия','Фото','Дизайн','Чтение','Кулинария','Танцы','Йога','Гейминг','Арт'];

type Tab = 'posts' | 'gifts' | 'info' | 'settings';
// Post type already defined above

// ─── SVG icons ───────────────────────────────────────────────────────────────
const GridIcon   = ({ c }: { c: string }) => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Rect x="3" y="3" width="7" height="7" rx="1" stroke={c} strokeWidth="1.8"/><Rect x="14" y="3" width="7" height="7" rx="1" stroke={c} strokeWidth="1.8"/><Rect x="3" y="14" width="7" height="7" rx="1" stroke={c} strokeWidth="1.8"/><Rect x="14" y="14" width="7" height="7" rx="1" stroke={c} strokeWidth="1.8"/></Svg>;
const GiftIcon   = ({ c }: { c: string }) => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Rect x="3" y="9" width="18" height="13" rx="2" stroke={c} strokeWidth="1.8"/><Path d="M12 9v13M3 13h18M8 9c0-2 1.8-4 4-4s4 2 4 4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></Svg>;
const InfoIcon   = ({ c }: { c: string }) => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={c} strokeWidth="1.8"/><Path d="M12 16v-4M12 8h.01" stroke={c} strokeWidth="2" strokeLinecap="round"/></Svg>;
const CogIcon    = ({ c }: { c: string }) => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8"/><Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={c} strokeWidth="1.8"/></Svg>;
const HeartIcon  = ({ filled }: { filled: boolean }) => <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 000-7.78z" fill={filled ? '#F05A7E' : 'none'} stroke={filled ? '#F05A7E' : '#fff'} strokeWidth="2" strokeLinejoin="round"/></Svg>;

function Row({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={ps.settingRow}>
      <Text style={ps.settingLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" />
    </View>
  );
}

// ─── Full-screen post viewer (vertical paging, Instagram-style) ──────────────
function PostViewer({ posts, startIndex, visible, onClose, onLike }: {
  posts: Post[]; startIndex: number; visible: boolean;
  onClose: () => void; onLike: (id: string) => void;
}) {
  const social = useSocialStore();
  const listRef = useRef<FlatList<Post>>(null);
  const ITEM_H = SW * 1.1; // slightly taller than square

  const renderItem = useCallback(({ item }: { item: Post }) => {
    const liked = social.isLiked(item.id);
    return (
      <View style={{ width: SW, height: ITEM_H }}>
        <Image source={{ uri: item.uri }} style={{ width: SW, height: SW }} resizeMode="cover" />
        <View style={pv.bar}>
          {!!item.caption && <Text style={pv.caption} numberOfLines={2}>{item.caption}</Text>}
          <TouchableOpacity onPress={() => onLike(item.id)} style={pv.likeBtn}>
            <HeartIcon filled={liked} />
            <Text style={pv.likeNum}>{item.likes + (liked ? 1 : 0)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [social, onLike, ITEM_H]);

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TouchableOpacity style={pv.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <FlatList<Post>
          ref={listRef}
          data={posts}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
          decelerationRate="fast"
        />
      </View>
    </Modal>
  );
}
const pv = StyleSheet.create({
  bar: { backgroundColor: 'rgba(0,0,0,0.78)', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caption: { color: '#fff', fontSize: 14, flex: 1, lineHeight: 18 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12 },
  likeNum: { color: '#fff', fontSize: 14, fontWeight: '600' },
  closeBtn: { position: 'absolute', top: 52, left: 16, zIndex: 20, width: 36, height: 36, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export function ProfileScreen() {
  const { user, avatarUri, logout, updateProfile } = useAuthStore();
  const social = useSocialStore();

  // profile state
  const [fields, setFields]             = useState<ProfileField[]>(DEFAULT_FIELDS);
  const [hobbies, setHobbies]           = useState(['Музыка', 'Путешествия', 'Кино']);
  const [showGifts, setShowGifts]       = useState(true);
  const [showFavCount, setShowFavCount] = useState(true);
  const [hideOnline, setHideOnline]     = useState(false);
  const [activeTab, setActiveTab]       = useState<Tab>('posts');
  const [editField, setEditField]       = useState<ProfileField | null>(null);
  const [editValue, setEditValue]       = useState('');
  const [editingName, setEditingName]   = useState(false);
  const [nameValue, setNameValue]       = useState(user?.displayName ?? '');
  const [bio, setBio]                   = useState('');
  const [editingBio, setEditingBio]     = useState(false);
  const [bioValue, setBioValue]         = useState('');

  // posts + pagination
  const [userPosts, setUserPosts]       = useState<Post[]>(ALL_POSTS.slice(0, PAGE_SIZE));
  const [page, setPage]                 = useState(1);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [viewerIndex, setViewerIndex]   = useState(0);
  const [viewerOpen, setViewerOpen]     = useState(false);

  const MOCK_FAV_COUNT = 47;

  // ── Pagination ─────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (loadingMore || activeTab !== 'posts') return;
    const nextStart = page * PAGE_SIZE;
    if (nextStart >= ALL_POSTS.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      setUserPosts(prev => [...prev, ...ALL_POSTS.slice(nextStart, nextStart + PAGE_SIZE)]);
      setPage(p => p + 1);
      setLoadingMore(false);
    }, 500); // simulate network delay
  }, [loadingMore, page, activeTab]);

  // ── Post actions ───────────────────────────────────────────────────────
  const openViewer = useCallback((idx: number) => { setViewerIndex(idx); setViewerOpen(true); }, []);
  const handleLike = useCallback((id: string) => social.toggleLike(id), [social]);

  const addPost = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа к галерее'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled) return;
    const newPost: Post = { id: `up_${Date.now()}`, uri: result.assets[0].uri, caption: '', likes: 0, pinned: false };
    setUserPosts(prev => [newPost, ...prev]);
  }, []);

  // ── Pin / unpin post ───────────────────────────────────────────────────
  const togglePin = useCallback((id: string) => {
    setUserPosts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p);
      // pinned posts float to front
      return [...updated.filter(p => p.pinned), ...updated.filter(p => !p.pinned)];
    });
  }, []);

  const deletePost = useCallback((id: string) => {
    setUserPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  const onPostLongPress = useCallback((post: Post) => {
    const isPinned = post.pinned;
    const opts = [isPinned ? 'Открепить' : 'Закрепить', 'Поделиться', 'Удалить пост', 'Отмена'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: opts, destructiveButtonIndex: 2, cancelButtonIndex: 3 },
        i => {
          if (i === 0) togglePin(post.id);
          if (i === 1) void Share.share({ url: post.uri });
          if (i === 2) Alert.alert('Удалить пост?', '', [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Удалить', style: 'destructive', onPress: () => deletePost(post.id) },
          ]);
        },
      );
    } else {
      Alert.alert('Действие', '', [
        { text: isPinned ? 'Открепить' : 'Закрепить', onPress: () => togglePin(post.id) },
        { text: 'Поделиться', onPress: () => void Share.share({ message: post.uri }) },
        { text: 'Удалить', style: 'destructive', onPress: () => deletePost(post.id) },
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  }, [togglePin, deletePost]);

  // ── Avatar ─────────────────────────────────────────────────────────────
  const pickAvatar = useCallback(async (src: 'camera' | 'library') => {
    const perm = src === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    const res = src === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!res.canceled) updateProfile({ avatarUri: res.assets[0].uri });
  }, [updateProfile]);

  const onAvatarPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Камера', 'Из галереи', 'Отмена'], cancelButtonIndex: 2 },
        i => { if (i === 0) void pickAvatar('camera'); if (i === 1) void pickAvatar('library'); },
      );
    } else {
      Alert.alert('Фото профиля', '', [
        { text: 'Камера',      onPress: () => void pickAvatar('camera')  },
        { text: 'Из галереи',  onPress: () => void pickAvatar('library') },
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  }, [pickAvatar]);

  // ── Name / bio ─────────────────────────────────────────────────────────
  const saveName = useCallback(() => {
    const t = nameValue.trim();
    if (t) updateProfile({ displayName: t });
    setEditingName(false);
  }, [nameValue, updateProfile]);

  const saveBio = useCallback(() => { setBio(bioValue.trim()); setEditingBio(false); }, [bioValue]);

  const saveField = useCallback(() => {
    if (!editField) return;
    setFields(prev => prev.map(f => f.key === editField.key ? { ...f, value: editValue } : f));
    setEditField(null);
  }, [editField, editValue]);

  // ── FlatList: header component (scrolls with content) ──────────────────
  const TABS = [
    { key: 'posts' as Tab,    label: 'Посты',  Icon: GridIcon },
    { key: 'gifts' as Tab,    label: 'Дары',   Icon: GiftIcon },
    { key: 'info' as Tab,     label: 'Инфо',   Icon: InfoIcon },
    { key: 'settings' as Tab, label: 'Настр.', Icon: CogIcon  },
  ];

  const ListHeader = useMemo(() => (
    <View>
      {/* ── Profile card ── */}
      <View style={ps.header}>
        <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.82} style={ps.avatarOuter}>
          {avatarUri
            ? <Image source={{ uri: avatarUri }} style={ps.avatarImg} />
            : <View style={ps.avatarInner}><Text style={ps.avatarText}>{(user?.displayName ?? '?').charAt(0).toUpperCase()}</Text></View>}
          <View style={ps.cameraBadge}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
              <Circle cx="12" cy="13" r="4" stroke="#fff" strokeWidth="2"/>
            </Svg>
          </View>
        </TouchableOpacity>

        {editingName
          ? <TextInput style={ps.nameInput} value={nameValue} onChangeText={setNameValue} autoFocus returnKeyType="done" onSubmitEditing={saveName} onBlur={saveName} maxLength={40} />
          : <TouchableOpacity onPress={() => { setNameValue(user?.displayName ?? ''); setEditingName(true); }} style={ps.nameRow}>
              <Text style={ps.name}>{user?.displayName ?? 'Toki User'}</Text>
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </Svg>
            </TouchableOpacity>}

        <Text style={ps.email}>{user?.email ?? ''}</Text>

        {editingBio
          ? <TextInput style={ps.bioInput} value={bioValue} onChangeText={setBioValue} autoFocus multiline placeholder="Расскажи о себе..." placeholderTextColor={colors.textMuted} blurOnSubmit onBlur={saveBio} maxLength={150} />
          : <TouchableOpacity onPress={() => { setBioValue(bio); setEditingBio(true); }} style={ps.bioRow}>
              <Text style={[ps.bioText, !bio && ps.bioMuted]}>{bio || '+ Добавить описание'}</Text>
            </TouchableOpacity>}

        <View style={ps.statsRow}>
          <View style={ps.stat}><Text style={ps.statN}>{userPosts.length}</Text><Text style={ps.statL}>постов</Text></View>
          <View style={ps.statSep} />
          <View style={ps.stat}><Text style={ps.statN}>{MOCK_GIFTS.reduce((a,g)=>a+g.count,0)}</Text><Text style={ps.statL}>даров</Text></View>
          <View style={ps.statSep} />
          <View style={ps.stat}><Text style={ps.statN}>{showFavCount ? MOCK_FAV_COUNT : '—'}</Text><Text style={ps.statL}>в избр.</Text></View>
          <View style={ps.statSep} />
          <View style={ps.stat}><Text style={ps.statN}>128</Text><Text style={ps.statL}>встреч</Text></View>
        </View>

        <View style={ps.hobbiesRow}>
          {hobbies.map(h => <View key={h} style={ps.hobbyChip}><Text style={ps.hobbyChipTxt}>{h}</Text></View>)}
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={ps.tabs}>
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity key={key} style={[ps.tab, active && ps.tabActive]} onPress={() => setActiveTab(key)}>
              <Icon c={active ? colors.accent : colors.textMuted} />
              <Text style={[ps.tabTxt, active && ps.tabTxtActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Non-post tab bodies live here in the header ── */}
      {activeTab === 'gifts' && (
        <View style={ps.section}>
          <Row label="Показывать подарки в профиле" value={showGifts} onToggle={() => setShowGifts(v=>!v)} />
          {showGifts ? (
            <View style={ps.giftsGrid}>
              {MOCK_GIFTS.map(g => (
                <View key={g.id} style={ps.giftCard}>
                  <Text style={ps.giftEmoji}>{g.emoji}</Text>
                  {g.count > 1 && <View style={ps.giftBadge}><Text style={ps.giftBadgeTxt}>×{g.count}</Text></View>}
                  <Text style={ps.giftName}>{g.name}</Text>
                </View>
              ))}
            </View>
          ) : <Text style={ps.muted}>Подарки скрыты от других пользователей</Text>}
          <Text style={ps.muted}>Отправители подарков не раскрываются.</Text>
        </View>
      )}

      {activeTab === 'info' && (
        <View style={ps.section}>
          <Text style={ps.sectionTitle}>Личные данные</Text>
          {fields.map(f => (
            <View key={f.key} style={ps.fieldRow}>
              <View style={{flex:1}}>
                <Text style={ps.fieldLabel}>{f.label}</Text>
                <Text style={[ps.fieldVal, !f.visible && {color: colors.textMuted, fontStyle:'italic'}]}>
                  {f.visible ? f.value : '(скрыто)'}
                </Text>
              </View>
              <View style={ps.fieldActions}>
                <TouchableOpacity onPress={() => { setEditField(f); setEditValue(f.value); }} style={ps.editBtn}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </Svg>
                </TouchableOpacity>
                <Switch value={f.visible} onValueChange={() => setFields(prev=>prev.map(x=>x.key===f.key?{...x,visible:!x.visible}:x))} trackColor={{true:colors.accent,false:colors.border}} thumbColor="#fff" style={{transform:[{scaleX:0.8},{scaleY:0.8}]}} />
              </View>
            </View>
          ))}
          <Text style={[ps.sectionTitle, {marginTop:24}]}>Хобби и интересы</Text>
          <View style={ps.hobbiesWrap}>
            {HOBBIES.map(h => (
              <TouchableOpacity key={h} style={[ps.hobbyOpt, hobbies.includes(h) && ps.hobbyOptActive]}
                onPress={() => setHobbies(prev => prev.includes(h) ? prev.filter(x=>x!==h) : [...prev,h])}>
                <Text style={[ps.hobbyOptTxt, hobbies.includes(h) && ps.hobbyOptTxtActive]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {activeTab === 'settings' && (
        <View style={ps.section}>
          <Text style={ps.sectionTitle}>Конфиденциальность</Text>
          <Row label="Показывать возраст"           value={fields.find(f=>f.key==='age')?.visible??true}        onToggle={()=>setFields(p=>p.map(f=>f.key==='age'?{...f,visible:!f.visible}:f))} />
          <Row label="Показывать город"             value={fields.find(f=>f.key==='city')?.visible??true}       onToggle={()=>setFields(p=>p.map(f=>f.key==='city'?{...f,visible:!f.visible}:f))} />
          <Row label="Показывать работу"            value={fields.find(f=>f.key==='occupation')?.visible??true} onToggle={()=>setFields(p=>p.map(f=>f.key==='occupation'?{...f,visible:!f.visible}:f))} />
          <Row label="Показывать подарки"           value={showGifts}    onToggle={()=>setShowGifts(v=>!v)} />
          <Row label="Показывать кол-во избранных" value={showFavCount} onToggle={()=>setShowFavCount(v=>!v)} />
          <Row label="Скрыть статус «онлайн»"       value={hideOnline}   onToggle={()=>setHideOnline(v=>!v)} />
          <Text style={[ps.sectionTitle,{marginTop:24}]}>Аккаунт</Text>
          <View style={ps.idCard}>
            <Text style={ps.idLabel}>Твой ID</Text>
            <Text selectable style={ps.idVal}>{user?.id ?? '—'}</Text>
          </View>
          <TouchableOpacity style={ps.logoutBtn} onPress={()=>void logout()}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={colors.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            <Text style={ps.logoutTxt}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Add post button (only visible in posts tab) ── */}
      {activeTab === 'posts' && (
        <TouchableOpacity style={ps.addBtn} onPress={()=>void addPost()}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M12 5v14M5 12h14" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round"/>
          </Svg>
          <Text style={ps.addBtnTxt}>Добавить фото</Text>
        </TouchableOpacity>
      )}
    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [activeTab, avatarUri, bio, bioValue, editField, editingBio, editingName, fields, hobbies, nameValue, showFavCount, showGifts, userPosts.length, user]);

  // ── Grid cell renderer (posts tab only) ─────────────────────────────────
  const renderCell = useCallback(({ item, index }: { item: Post; index: number }) => (
    <TouchableOpacity
      style={ps.cell}
      onPress={() => openViewer(index)}
      onLongPress={() => onPostLongPress(item)}
      delayLongPress={380}
      activeOpacity={0.82}
    >
      <Image source={{ uri: item.uri }} style={ps.cellImg} />
      {/* Pin badge */}
      {item.pinned && (
        <View style={ps.pinBadge}>
          <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
            <Path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" fill="#fff" />
          </Svg>
        </View>
      )}
      {/* Like badge */}
      {social.isLiked(item.id) && !item.pinned && (
        <View style={ps.likedPin}>
          <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
            <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 000-7.78z" fill="#F05A7E"/>
          </Svg>
        </View>
      )}
    </TouchableOpacity>
  ), [openViewer, social, onPostLongPress]);

  const renderEmpty = useCallback(() => (
    <View style={{ alignItems: 'center', paddingTop: 48 }}>
      <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="3" width="7" height="7" rx="1" stroke={colors.border} strokeWidth="1.5"/>
        <Rect x="14" y="3" width="7" height="7" rx="1" stroke={colors.border} strokeWidth="1.5"/>
        <Rect x="3" y="14" width="7" height="7" rx="1" stroke={colors.border} strokeWidth="1.5"/>
        <Rect x="14" y="14" width="7" height="7" rx="1" stroke={colors.border} strokeWidth="1.5"/>
      </Svg>
      <Text style={{ color: colors.textMuted, marginTop: 14, fontSize: 15 }}>Нет постов</Text>
    </View>
  ), []);

  // When switching tabs: FlatList key must change to reset numColumns
  const listKey = activeTab === 'posts' ? 'grid3' : 'list1';

  return (
    <SafeAreaView style={ps.safe}>
      <FlatList<Post>
        key={listKey}
        data={activeTab === 'posts' ? userPosts : []}
        keyExtractor={item => item.id}
        renderItem={renderCell}
        numColumns={activeTab === 'posts' ? 3 : 1}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={activeTab === 'posts' ? renderEmpty : null}
        ListFooterComponent={loadingMore
          ? <View style={{ paddingVertical: 20 }}><ActivityIndicator color={colors.accent} /></View>
          : <View style={{ height: 32 }} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={activeTab === 'posts' ? ps.gridContent : undefined}
        columnWrapperStyle={activeTab === 'posts' ? ps.gridRow : undefined}
      />

      {/* ── Edit field modal ── */}
      <Modal visible={!!editField} transparent animationType="slide">
        <Pressable style={ps.backdrop} onPress={() => setEditField(null)} />
        <View style={ps.editSheet}>
          <Text style={ps.editTitle}>{editField?.label}</Text>
          <TextInput style={ps.editInput} value={editValue} onChangeText={setEditValue} autoFocus placeholder={editField?.label} placeholderTextColor={colors.textMuted} />
          <TouchableOpacity style={ps.editSave} onPress={saveField}>
            <Text style={ps.editSaveTxt}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Instagram-style viewer ── */}
      <PostViewer posts={userPosts} startIndex={viewerIndex} visible={viewerOpen} onClose={() => setViewerOpen(false)} onLike={handleLike} />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // header
  header: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },
  avatarOuter: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: colors.accent, padding: 2, marginBottom: 12, position: 'relative' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 44 },
  avatarInner: { flex: 1, borderRadius: 42, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '700' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  nameInput: { fontSize: 20, fontWeight: '700', color: colors.text, borderBottomWidth: 2, borderColor: colors.accent, paddingHorizontal: 4, paddingVertical: 2, minWidth: 160, textAlign: 'center', marginBottom: 2 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 1, marginBottom: 4 },
  bioRow: { marginTop: 2, marginBottom: 4 },
  bioText: { fontSize: 13, color: colors.text, textAlign: 'center', lineHeight: 18 },
  bioMuted: { color: colors.textMuted, fontStyle: 'italic' },
  bioInput: { fontSize: 13, color: colors.text, borderWidth: 1, borderColor: colors.accent, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 8, textAlign: 'center', lineHeight: 18, marginTop: 2, marginBottom: 4, minWidth: 200 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statN: { fontSize: 17, fontWeight: '700', color: colors.text },
  statL: { fontSize: 11, color: colors.textMuted },
  statSep: { width: 1, height: 30, backgroundColor: colors.border },
  hobbiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingBottom: 2 },
  hobbyChip: { backgroundColor: colors.accentSoft, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  hobbyChipTxt: { color: colors.accent, fontSize: 12, fontWeight: '600' },

  // tabs
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', gap: 3 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabTxt: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
  tabTxtActive: { color: colors.accent, fontWeight: '700' },

  // add post
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 10, backgroundColor: colors.accentSoft, borderRadius: radii.md, paddingVertical: 11, justifyContent: 'center' },
  addBtnTxt: { color: colors.accent, fontWeight: '600', fontSize: 15 },

  // grid
  gridContent: { paddingHorizontal: 0 },
  gridRow: { gap: 1.5 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, position: 'relative', marginBottom: 1.5 },
  cellImg: { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: colors.surface2 },
  likedPin: { position: 'absolute', bottom: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  pinBadge: { position: 'absolute', top: 5, left: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', ...shadows.btn },

  // section (gifts / info / settings)
  section: { padding: 20, backgroundColor: colors.bg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  giftsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, marginBottom: 12 },
  giftCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.border, minWidth: 72, position: 'relative', ...shadows.card },
  giftEmoji: { fontSize: 28 },
  giftBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: 5, paddingVertical: 1 },
  giftBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  giftName: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: 8, lineHeight: 18 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
  fieldLabel: { fontSize: 12, color: colors.textMuted },
  fieldVal: { fontSize: 15, color: colors.text, fontWeight: '500', marginTop: 2 },
  fieldActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  hobbiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hobbyOpt: { borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  hobbyOptActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  hobbyOptTxt: { color: colors.textMuted, fontSize: 13 },
  hobbyOptTxtActive: { color: colors.accent, fontWeight: '600' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  settingLabel: { color: colors.text, fontSize: 15, flex: 1 },
  idCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  idLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  idVal: { color: colors.accent, fontSize: 13 },
  logoutBtn: { borderRadius: radii.md, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.danger },
  logoutTxt: { color: colors.danger, fontWeight: '600', fontSize: 16 },

  // edit field modal
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  editSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: 24, paddingBottom: 40 },
  editTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 14 },
  editInput: { backgroundColor: colors.surface2, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text, marginBottom: 16 },
  editSave: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: 14, alignItems: 'center', ...shadows.btn },
  editSaveTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
