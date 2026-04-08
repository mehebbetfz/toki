import { useCallback, useRef, useState } from 'react';
import {
  ActionSheetIOS, Alert, Dimensions, FlatList, Image, Modal, Platform,
  Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { colors, radii, shadows } from '../theme';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';

const { width: SW } = Dimensions.get('window');

// ─── Mock data ──────────────────────────────────────────────────────────────
const MOCK_GIFTS = [
  { id: '1', name: 'Роза', emoji: '🌹', count: 3, visible: true },
  { id: '2', name: 'Алмаз', emoji: '💎', count: 1, visible: true },
  { id: '3', name: 'Огонь', emoji: '🔥', count: 5, visible: true },
  { id: '4', name: 'Звезда', emoji: '⭐', count: 2, visible: true },
  { id: '5', name: 'Ракета', emoji: '🚀', count: 1, visible: true },
];

const BASE_POSTS = [
  { id: 'p1', uri: 'https://picsum.photos/seed/toki1/600/600', caption: 'Отличный день! ☀️', likes: 14 },
  { id: 'p2', uri: 'https://picsum.photos/seed/toki2/600/600', caption: 'Природа и спокойствие 🌿', likes: 9 },
  { id: 'p3', uri: 'https://picsum.photos/seed/toki3/600/600', caption: 'Кофе и код ☕', likes: 22 },
  { id: 'p4', uri: 'https://picsum.photos/seed/toki4/600/600', caption: 'Вечерний Баку 🌃', likes: 31 },
  { id: 'p5', uri: 'https://picsum.photos/seed/toki5/600/600', caption: '', likes: 7 },
  { id: 'p6', uri: 'https://picsum.photos/seed/toki6/600/600', caption: 'Горы зовут 🏔', likes: 18 },
];

interface ProfileField { key: string; label: string; value: string; visible: boolean; }
const DEFAULT_FIELDS: ProfileField[] = [
  { key: 'age', label: 'Возраст', value: '25', visible: true },
  { key: 'city', label: 'Город', value: 'Баку', visible: true },
  { key: 'occupation', label: 'Работа', value: 'Разработчик', visible: true },
  { key: 'education', label: 'Образование', value: 'БГТУ', visible: false },
  { key: 'languages', label: 'Языки', value: 'RU, EN, AZ', visible: true },
  { key: 'relationship', label: 'Статус', value: 'Свободен', visible: false },
];
const HOBBIES_OPTIONS = ['Музыка', 'Кино', 'Спорт', 'Путешествия', 'Фото', 'Дизайн', 'Чтение', 'Кулинария', 'Танцы', 'Йога', 'Гейминг', 'Арт'];

// ─── SVG Tab Icons ───────────────────────────────────────────────────────────
function GridIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" /><Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" /><Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" /><Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" /></Svg>;
}
function GiftSvg({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Rect x="3" y="9" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8" /><Path d="M12 9v13M3 13h18M8 9c0-2 1.8-4 4-4s4 2 4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></Svg>;
}
function InfoIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" /><Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth="2" strokeLinecap="round" /></Svg>;
}
function SettingsIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth="1.8" /><Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth="1.8" /></Svg>;
}

function SettingRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={ps.settingRow}>
      <Text style={ps.settingLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" />
    </View>
  );
}

// ─── Instagram-style post viewer ─────────────────────────────────────────────
function PostViewer({
  posts, startIndex, visible, onClose, onLike,
}: {
  posts: typeof BASE_POSTS;
  startIndex: number;
  visible: boolean;
  onClose: () => void;
  onLike: (id: string) => void;
}) {
  const social = useSocialStore();
  const listRef = useRef<FlatList>(null);
  const renderPost = useCallback(({ item }: { item: typeof BASE_POSTS[0] }) => {
    const liked = social.isLiked(item.id);
    return (
      <View style={pv.slide}>
        <Image source={{ uri: item.uri }} style={pv.img} resizeMode="cover" />
        <View style={pv.overlay}>
          {!!item.caption && <Text style={pv.caption}>{item.caption}</Text>}
          <View style={pv.likeRow}>
            <TouchableOpacity onPress={() => onLike(item.id)} style={pv.likeBtn}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                  fill={liked ? '#F05A7E' : 'none'} stroke={liked ? '#F05A7E' : '#fff'} strokeWidth="2" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
            <Text style={pv.likeCount}>{item.likes + (liked ? 1 : 0)}</Text>
          </View>
        </View>
      </View>
    );
  }, [social, onLike]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pv.bg}>
        <TouchableOpacity style={pv.closeBtn} onPress={onClose}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={i => i.id}
          renderItem={renderPost}
          horizontal={false}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: SW, offset: SW * index, index })}
        />
      </View>
    </Modal>
  );
}

const pv = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000' },
  slide: { width: SW, height: SW, position: 'relative' },
  img: { width: SW, height: SW },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 20 },
  caption: { color: '#fff', fontSize: 14, marginBottom: 12, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  likeCount: { color: '#fff', fontSize: 14, fontWeight: '600' },
  closeBtn: { position: 'absolute', top: 48, right: 16, zIndex: 10, width: 36, height: 36, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

// ─── Main ────────────────────────────────────────────────────────────────────
export function ProfileScreen() {
  const { user, avatarUri, logout, updateProfile } = useAuthStore();
  const social = useSocialStore();

  const [fields, setFields] = useState<ProfileField[]>(DEFAULT_FIELDS);
  const [hobbies, setHobbies] = useState<string[]>(['Музыка', 'Путешествия', 'Кино']);
  const [showGifts, setShowGifts] = useState(true);
  const [showFavCount, setShowFavCount] = useState(true);
  const [hideOnline, setHideOnline] = useState(false);
  const [gifts] = useState(MOCK_GIFTS);
  const [posts, setPosts] = useState(BASE_POSTS);
  const [activeTab, setActiveTab] = useState<'posts' | 'gifts' | 'info' | 'settings'>('posts');
  const [editField, setEditField] = useState<ProfileField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  // ── inline name / bio edit ──────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState('');

  const MOCK_FAV_COUNT = 47;

  const toggleHobby = (h: string) => setHobbies(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  const toggleFieldVis = (key: string) => setFields(prev => prev.map(f => f.key === key ? { ...f, visible: !f.visible } : f));
  const saveField = () => {
    if (!editField) return;
    setFields(prev => prev.map(f => f.key === editField.key ? { ...f, value: editValue } : f));
    setEditField(null);
  };

  const openPost = useCallback((idx: number) => { setViewerIndex(idx); setViewerOpen(true); }, []);
  const handleLike = useCallback((id: string) => social.toggleLike(id), [social]);

  const addPost = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled) return;
    setPosts(prev => [{ id: `p_${Date.now()}`, uri: result.assets[0].uri, caption: '', likes: 0 }, ...prev]);
  }, []);

  // ── Avatar picker ──────────────────────────────────────────────────────
  const pickAvatar = useCallback(async (source: 'library' | 'camera') => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('Нет доступа к ' + (source === 'camera' ? 'камере' : 'галерее')); return; }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (result.canceled) return;
    updateProfile({ avatarUri: result.assets[0].uri });
  }, [updateProfile]);

  const onAvatarPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Камера', 'Из галереи', 'Отмена'], cancelButtonIndex: 2 },
        i => { if (i === 0) void pickAvatar('camera'); if (i === 1) void pickAvatar('library'); },
      );
    } else {
      Alert.alert('Фото профиля', '', [
        { text: 'Камера', onPress: () => void pickAvatar('camera') },
        { text: 'Из галереи', onPress: () => void pickAvatar('library') },
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  }, [pickAvatar]);

  // ── Name save ─────────────────────────────────────────────────────────
  const saveName = useCallback(() => {
    const trimmed = nameValue.trim();
    if (trimmed) updateProfile({ displayName: trimmed });
    setEditingName(false);
  }, [nameValue, updateProfile]);

  const saveBio = useCallback(() => {
    setBio(bioValue.trim());
    setEditingBio(false);
  }, [bioValue]);

  const TABS = [
    { key: 'posts', label: 'Посты', Icon: GridIcon },
    { key: 'gifts', label: 'Дары', Icon: GiftSvg },
    { key: 'info', label: 'Инфо', Icon: InfoIcon },
    { key: 'settings', label: 'Настр.', Icon: SettingsIcon },
  ] as const;

  return (
    <SafeAreaView style={ps.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={ps.header}>
          {/* Avatar with camera badge */}
          <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.82} style={ps.avatarOuter}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={ps.avatarImage} />
              : <View style={ps.avatarInner}>
                  <Text style={ps.avatarText}>{(user?.displayName ?? '?').charAt(0).toUpperCase()}</Text>
                </View>}
            <View style={ps.cameraBadge}>
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                <Circle cx="12" cy="13" r="4" stroke="#fff" strokeWidth="2" />
              </Svg>
            </View>
          </TouchableOpacity>

          {/* Editable name */}
          {editingName ? (
            <View style={ps.nameEditRow}>
              <TextInput
                style={ps.nameInput}
                value={nameValue}
                onChangeText={setNameValue}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveName}
                onBlur={saveName}
                maxLength={40}
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setNameValue(user?.displayName ?? ''); setEditingName(true); }} style={ps.nameRow}>
              <Text style={ps.name}>{user?.displayName ?? 'Toki User'}</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                  stroke={colors.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          )}

          <Text style={ps.email}>{user?.email ?? ''}</Text>

          {/* Editable bio */}
          {editingBio ? (
            <View style={ps.bioEditWrap}>
              <TextInput
                style={ps.bioInput}
                value={bioValue}
                onChangeText={setBioValue}
                autoFocus
                multiline
                placeholder="Расскажи о себе..."
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                blurOnSubmit
                onBlur={saveBio}
                maxLength={150}
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setBioValue(bio); setEditingBio(true); }} style={ps.bioRow}>
              <Text style={[ps.bioText, !bio && ps.bioPlaceholder]}>
                {bio || 'Добавить описание...'}
              </Text>
              {!!bio && (
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                    stroke={colors.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </TouchableOpacity>
          )}

          <View style={ps.statsRow}>
            <View style={ps.stat}><Text style={ps.statNum}>{posts.length}</Text><Text style={ps.statLabel}>постов</Text></View>
            <View style={ps.statDiv} />
            <View style={ps.stat}><Text style={ps.statNum}>{gifts.reduce((a, g) => a + g.count, 0)}</Text><Text style={ps.statLabel}>даров</Text></View>
            <View style={ps.statDiv} />
            <View style={ps.stat}>
              <Text style={ps.statNum}>{showFavCount ? MOCK_FAV_COUNT : '—'}</Text>
              <Text style={ps.statLabel}>в избр.</Text>
            </View>
            <View style={ps.statDiv} />
            <View style={ps.stat}><Text style={ps.statNum}>128</Text><Text style={ps.statLabel}>встреч</Text></View>
          </View>

          <View style={ps.hobbiesRow}>
            {hobbies.map(h => <View key={h} style={ps.hobbyChip}><Text style={ps.hobbyChipText}>{h}</Text></View>)}
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={ps.tabs}>
          {TABS.map(({ key, label, Icon }) => {
            const active = activeTab === key;
            return (
              <TouchableOpacity key={key} style={[ps.tab, active && ps.tabActive]} onPress={() => setActiveTab(key)}>
                <Icon color={active ? colors.accent : colors.textMuted} />
                <Text style={[ps.tabText, active && ps.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── POSTS ── */}
        {activeTab === 'posts' && (
          <View>
            <TouchableOpacity style={ps.addPostBtn} onPress={() => void addPost()}>
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                <Path d="M12 5v14M5 12h14" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" />
              </Svg>
              <Text style={ps.addPostText}>Добавить фото</Text>
            </TouchableOpacity>
            <View style={ps.grid}>
              {posts.map((post, idx) => (
                <TouchableOpacity key={post.id} style={ps.gridCell} activeOpacity={0.85} onPress={() => openPost(idx)}>
                  <Image source={{ uri: post.uri }} style={ps.gridImg} />
                  {social.isLiked(post.id) && (
                    <View style={ps.likedBadge}>
                      <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                        <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 000-7.78z" fill="#F05A7E" />
                      </Svg>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── GIFTS ── */}
        {activeTab === 'gifts' && (
          <View style={ps.section}>
            <SettingRow label="Показывать подарки в профиле" value={showGifts} onToggle={() => setShowGifts(v => !v)} />
            {showGifts ? (
              <View style={ps.giftsGrid}>
                {gifts.map(g => (
                  <View key={g.id} style={ps.giftBadge}>
                    <Text style={ps.giftEmoji}>{g.emoji}</Text>
                    {g.count > 1 && <View style={ps.giftCount}><Text style={ps.giftCountText}>×{g.count}</Text></View>}
                    <Text style={ps.giftName}>{g.name}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={ps.mutedNote}>Подарки скрыты от других пользователей</Text>
            )}
            <Text style={ps.mutedNote}>Отправители подарков не раскрываются.</Text>
          </View>
        )}

        {/* ── INFO ── */}
        {activeTab === 'info' && (
          <View style={ps.section}>
            <Text style={ps.sectionTitle}>Личные данные</Text>
            {fields.map(f => (
              <View key={f.key} style={ps.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={ps.fieldLabel}>{f.label}</Text>
                  <Text style={[ps.fieldValue, !f.visible && { color: colors.textMuted, fontStyle: 'italic' }]}>
                    {f.visible ? f.value : '(скрыто)'}
                  </Text>
                </View>
                <View style={ps.fieldActions}>
                  <TouchableOpacity onPress={() => { setEditField(f); setEditValue(f.value); }} style={ps.fieldBtn}>
                    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </TouchableOpacity>
                  <Switch value={f.visible} onValueChange={() => toggleFieldVis(f.key)} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
                </View>
              </View>
            ))}
            <Text style={[ps.sectionTitle, { marginTop: 24 }]}>Хобби и интересы</Text>
            <View style={ps.hobbiesWrap}>
              {HOBBIES_OPTIONS.map(h => (
                <TouchableOpacity key={h} style={[ps.hobbyOption, hobbies.includes(h) && ps.hobbyOptionActive]} onPress={() => toggleHobby(h)}>
                  <Text style={[ps.hobbyOptionText, hobbies.includes(h) && ps.hobbyOptionTextActive]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && (
          <View style={ps.section}>
            <Text style={ps.sectionTitle}>Конфиденциальность</Text>
            <SettingRow label="Показывать возраст" value={fields.find(f => f.key === 'age')?.visible ?? true} onToggle={() => toggleFieldVis('age')} />
            <SettingRow label="Показывать город" value={fields.find(f => f.key === 'city')?.visible ?? true} onToggle={() => toggleFieldVis('city')} />
            <SettingRow label="Показывать работу" value={fields.find(f => f.key === 'occupation')?.visible ?? true} onToggle={() => toggleFieldVis('occupation')} />
            <SettingRow label="Показывать подарки" value={showGifts} onToggle={() => setShowGifts(v => !v)} />
            <SettingRow label="Показывать кол-во избранных" value={showFavCount} onToggle={() => setShowFavCount(v => !v)} />
            <SettingRow label="Скрыть статус «онлайн»" value={hideOnline} onToggle={() => setHideOnline(v => !v)} />

            <Text style={[ps.sectionTitle, { marginTop: 24 }]}>Аккаунт</Text>
            <View style={ps.idCard}>
              <Text style={ps.idLabel}>Твой ID</Text>
              <Text selectable style={ps.idValue}>{user?.id ?? '—'}</Text>
            </View>
            <TouchableOpacity style={ps.logoutBtn} onPress={() => void logout()}>
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={colors.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={ps.logoutText}>Выйти из аккаунта</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Edit field modal ── */}
      <Modal visible={!!editField} transparent animationType="slide">
        <Pressable style={ps.backdrop} onPress={() => setEditField(null)} />
        <View style={ps.editSheet}>
          <Text style={ps.editTitle}>{editField?.label}</Text>
          <TextInput style={ps.editInput} value={editValue} onChangeText={setEditValue} autoFocus placeholder={editField?.label} placeholderTextColor={colors.textMuted} />
          <TouchableOpacity style={ps.editSaveBtn} onPress={saveField}>
            <Text style={ps.editSaveText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Instagram-style post viewer ── */}
      <PostViewer posts={posts} startIndex={viewerIndex} visible={viewerOpen} onClose={() => setViewerOpen(false)} onLike={handleLike} />
    </SafeAreaView>
  );
}

const ps = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },
  avatarOuter: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: colors.accent, padding: 2, marginBottom: 12, position: 'relative' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 44 },
  avatarInner: { flex: 1, borderRadius: 42, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '700' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  nameEditRow: { marginBottom: 2 },
  nameInput: { fontSize: 20, fontWeight: '700', color: colors.text, borderBottomWidth: 2, borderColor: colors.accent, paddingHorizontal: 4, paddingVertical: 2, minWidth: 160, textAlign: 'center' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  bioRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginBottom: 2, paddingHorizontal: 8 },
  bioText: { fontSize: 13, color: colors.text, textAlign: 'center', lineHeight: 18 },
  bioPlaceholder: { color: colors.textMuted, fontStyle: 'italic' },
  bioEditWrap: { width: '100%', marginTop: 6, marginBottom: 2 },
  bioInput: { fontSize: 13, color: colors.text, borderWidth: 1, borderColor: colors.accent, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 8, textAlign: 'center', lineHeight: 18 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 17, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statDiv: { width: 1, height: 30, backgroundColor: colors.border },
  hobbiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingBottom: 4 },
  hobbyChip: { backgroundColor: colors.accentSoft, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  hobbyChipText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', gap: 2 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: colors.accent, fontWeight: '700' },
  addPostBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 14, marginBottom: 10, backgroundColor: colors.accentSoft, borderRadius: radii.md, paddingVertical: 11, justifyContent: 'center' },
  addPostText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 1 },
  gridCell: { width: '33.33%', aspectRatio: 1, padding: 1, position: 'relative' },
  gridImg: { flex: 1, backgroundColor: colors.surface2 },
  likedBadge: { position: 'absolute', bottom: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  giftsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12, marginTop: 14 },
  giftBadge: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.border, minWidth: 72, position: 'relative', ...shadows.card },
  giftEmoji: { fontSize: 28 },
  giftCount: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: 5, paddingVertical: 1 },
  giftCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  giftName: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  mutedNote: { color: colors.textMuted, fontSize: 12, marginTop: 8, lineHeight: 18 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
  fieldLabel: { fontSize: 12, color: colors.textMuted },
  fieldValue: { fontSize: 15, color: colors.text, fontWeight: '500', marginTop: 2 },
  fieldActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  hobbiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hobbyOption: { borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  hobbyOptionActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  hobbyOptionText: { color: colors.textMuted, fontSize: 13 },
  hobbyOptionTextActive: { color: colors.accent, fontWeight: '600' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  settingLabel: { color: colors.text, fontSize: 15, flex: 1 },
  idCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  idLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  idValue: { color: colors.accent, fontSize: 13 },
  logoutBtn: { borderRadius: radii.md, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.danger },
  logoutText: { color: colors.danger, fontWeight: '600', fontSize: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  editSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: 24, paddingBottom: 40 },
  editTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 14 },
  editInput: { backgroundColor: colors.surface2, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text, marginBottom: 16 },
  editSaveBtn: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: 14, alignItems: 'center', ...shadows.btn },
  editSaveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
