import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { colors, radii, shadows } from '../theme';
import { useAuthStore } from '../store/useAuthStore';

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_GIFTS = [
  { id: '1', name: 'Роза', emoji: '🌹', count: 3, visible: true },
  { id: '2', name: 'Сердце', emoji: '💎', count: 1, visible: true },
  { id: '3', name: 'Огонь', emoji: '🔥', count: 5, visible: true },
  { id: '4', name: 'Звезда', emoji: '⭐', count: 2, visible: true },
];

const MOCK_POSTS = [
  { id: 'p1', uri: 'https://picsum.photos/seed/toki1/400/400', caption: 'Отличный день! ☀️' },
  { id: 'p2', uri: 'https://picsum.photos/seed/toki2/400/400', caption: 'Природа и спокойствие 🌿' },
  { id: 'p3', uri: 'https://picsum.photos/seed/toki3/400/400', caption: 'Кофе и код ☕' },
  { id: 'p4', uri: 'https://picsum.photos/seed/toki4/400/400', caption: 'Вечерний Баку 🌃' },
  { id: 'p5', uri: 'https://picsum.photos/seed/toki5/400/400', caption: '' },
  { id: 'p6', uri: 'https://picsum.photos/seed/toki6/400/400', caption: 'Горы зовут 🏔' },
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

// ─── Sub-components ─────────────────────────────────────────────────────────

function SettingRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={p.settingRow}>
      <Text style={p.settingLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" />
    </View>
  );
}

function GiftBadge({ gift }: { gift: typeof MOCK_GIFTS[0] }) {
  return (
    <View style={p.giftBadge}>
      <Text style={p.giftEmoji}>{gift.emoji}</Text>
      {gift.count > 1 && <View style={p.giftCount}><Text style={p.giftCountText}>×{gift.count}</Text></View>}
      <Text style={p.giftName}>{gift.name}</Text>
    </View>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [fields, setFields] = useState<ProfileField[]>(DEFAULT_FIELDS);
  const [hobbies, setHobbies] = useState<string[]>(['Музыка', 'Путешествия', 'Кино']);
  const [showGifts, setShowGifts] = useState(true);
  const [gifts] = useState(MOCK_GIFTS);
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [activeTab, setActiveTab] = useState<'posts' | 'gifts' | 'info' | 'settings'>('posts');
  const [editField, setEditField] = useState<ProfileField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedPost, setSelectedPost] = useState<typeof MOCK_POSTS[0] | null>(null);

  const toggleHobby = (h: string) => setHobbies(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);

  const toggleFieldVis = (key: string) => setFields(prev => prev.map(f => f.key === key ? { ...f, visible: !f.visible } : f));

  const saveField = () => {
    if (!editField) return;
    setFields(prev => prev.map(f => f.key === editField.key ? { ...f, value: editValue } : f));
    setEditField(null);
  };

  const addPost = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const newPost = { id: `p_${Date.now()}`, uri, caption: '' };
    setPosts(prev => [newPost, ...prev]);
  }, []);

  const numCols = 3;

  return (
    <SafeAreaView style={p.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={p.header}>
          <View style={p.avatarOuter}>
            <View style={p.avatarInner}>
              <Text style={p.avatarText}>{user?.displayName?.charAt(0).toUpperCase() ?? '?'}</Text>
            </View>
          </View>
          <Text style={p.name}>{user?.displayName ?? '—'}</Text>
          <Text style={p.email}>{user?.email ?? ''}</Text>

          {/* Stats row */}
          <View style={p.statsRow}>
            <View style={p.stat}><Text style={p.statNum}>{posts.length}</Text><Text style={p.statLabel}>постов</Text></View>
            <View style={p.statDiv} />
            <View style={p.stat}><Text style={p.statNum}>{gifts.reduce((a, g) => a + g.count, 0)}</Text><Text style={p.statLabel}>подарков</Text></View>
            <View style={p.statDiv} />
            <View style={p.stat}><Text style={p.statNum}>128</Text><Text style={p.statLabel}>встреч</Text></View>
          </View>

          {/* Hobbies chips */}
          <View style={p.hobbiesRow}>
            {hobbies.map(h => (
              <View key={h} style={p.hobbyChip}><Text style={p.hobbyChipText}>{h}</Text></View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={p.tabs}>
          {(['posts', 'gifts', 'info', 'settings'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[p.tab, activeTab === tab && p.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[p.tabText, activeTab === tab && p.tabTextActive]}>
                {tab === 'posts' ? '⊞ Посты' : tab === 'gifts' ? '🎁 Подарки' : tab === 'info' ? '👤 Инфо' : '⚙️ Настр.'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── POSTS ── */}
        {activeTab === 'posts' && (
          <View>
            <TouchableOpacity style={p.addPostBtn} onPress={() => void addPost()}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M12 5v14M5 12h14" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" />
              </Svg>
              <Text style={p.addPostText}>Добавить пост</Text>
            </TouchableOpacity>
            <View style={p.grid}>
              {posts.map((post, idx) => (
                <TouchableOpacity key={post.id} style={p.gridCell} activeOpacity={0.85} onPress={() => setSelectedPost(post)}>
                  <Image source={{ uri: post.uri }} style={p.gridImg} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── GIFTS ── */}
        {activeTab === 'gifts' && (
          <View style={p.section}>
            <View style={p.sectionHeader}>
              <Text style={p.sectionTitle}>Полученные подарки</Text>
              <SettingRow label="Показывать в профиле" value={showGifts} onToggle={() => setShowGifts(v => !v)} />
            </View>
            {showGifts ? (
              <View style={p.giftsGrid}>
                {gifts.map(g => <GiftBadge key={g.id} gift={g} />)}
              </View>
            ) : (
              <Text style={p.mutedNote}>Подарки скрыты от других пользователей</Text>
            )}
            <Text style={p.mutedNote}>Отправители подарков не раскрываются.</Text>
          </View>
        )}

        {/* ── INFO ── */}
        {activeTab === 'info' && (
          <View style={p.section}>
            <Text style={p.sectionTitle}>Личные данные</Text>
            {fields.map(f => (
              <View key={f.key} style={p.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={p.fieldLabel}>{f.label}</Text>
                  <Text style={[p.fieldValue, !f.visible && { color: colors.textMuted, fontStyle: 'italic' }]}>
                    {f.visible ? f.value : '(скрыто)'}
                  </Text>
                </View>
                <View style={p.fieldActions}>
                  <TouchableOpacity onPress={() => { setEditField(f); setEditValue(f.value); }} style={p.fieldBtn}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </TouchableOpacity>
                  <Switch value={f.visible} onValueChange={() => toggleFieldVis(f.key)} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
                </View>
              </View>
            ))}

            <Text style={[p.sectionTitle, { marginTop: 24 }]}>Хобби и интересы</Text>
            <View style={p.hobbiesWrap}>
              {HOBBIES_OPTIONS.map(h => (
                <TouchableOpacity key={h} style={[p.hobbyOption, hobbies.includes(h) && p.hobbyOptionActive]} onPress={() => toggleHobby(h)}>
                  <Text style={[p.hobbyOptionText, hobbies.includes(h) && p.hobbyOptionTextActive]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && (
          <View style={p.section}>
            <Text style={p.sectionTitle}>Конфиденциальность</Text>
            <SettingRow label="Показывать возраст" value={fields.find(f => f.key === 'age')?.visible ?? true} onToggle={() => toggleFieldVis('age')} />
            <SettingRow label="Показывать город" value={fields.find(f => f.key === 'city')?.visible ?? true} onToggle={() => toggleFieldVis('city')} />
            <SettingRow label="Показывать работу" value={fields.find(f => f.key === 'occupation')?.visible ?? true} onToggle={() => toggleFieldVis('occupation')} />
            <SettingRow label="Показывать подарки" value={showGifts} onToggle={() => setShowGifts(v => !v)} />

            <Text style={[p.sectionTitle, { marginTop: 24 }]}>Аккаунт</Text>
            <View style={p.idCard}>
              <Text style={p.idLabel}>Твой ID</Text>
              <Text selectable style={p.idValue}>{user?.id ?? '—'}</Text>
            </View>
            <TouchableOpacity style={p.logoutBtn} onPress={() => void logout()}>
              <Text style={p.logoutText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit field modal */}
      <Modal visible={!!editField} transparent animationType="slide">
        <Pressable style={p.backdrop} onPress={() => setEditField(null)} />
        <View style={p.editSheet}>
          <Text style={p.editTitle}>{editField?.label}</Text>
          <TextInput
            style={p.editInput}
            value={editValue}
            onChangeText={setEditValue}
            autoFocus
            placeholder={editField?.label}
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity style={p.editSaveBtn} onPress={saveField}>
            <Text style={p.editSaveText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Post viewer modal */}
      <Modal visible={!!selectedPost} transparent animationType="fade">
        <Pressable style={p.postBackdrop} onPress={() => setSelectedPost(null)}>
          <View style={p.postViewer}>
            {selectedPost && <>
              <Image source={{ uri: selectedPost.uri }} style={p.postViewerImg} resizeMode="contain" />
              {!!selectedPost.caption && <Text style={p.postCaption}>{selectedPost.caption}</Text>}
            </>}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const POST_W = 124;
const p = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },
  avatarOuter: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.accent, padding: 3, marginBottom: 10 },
  avatarInner: { flex: 1, borderRadius: 40, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  statDiv: { width: 1, height: 32, backgroundColor: colors.border },
  hobbiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingBottom: 4 },
  hobbyChip: { backgroundColor: colors.accentSoft, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  hobbyChipText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: colors.accent, fontWeight: '700' },
  addPostBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 14, marginBottom: 10, backgroundColor: colors.accentSoft, borderRadius: radii.md, paddingVertical: 11, justifyContent: 'center' },
  addPostText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 2 },
  gridCell: { width: '33.33%', aspectRatio: 1, padding: 1 },
  gridImg: { flex: 1, backgroundColor: colors.surface2 },
  section: { padding: 20 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  giftsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
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
  settingLabel: { color: colors.text, fontSize: 15 },
  idCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  idLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  idValue: { color: colors.accent, fontSize: 13, fontFamily: 'monospace' },
  logoutBtn: { borderRadius: radii.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.danger },
  logoutText: { color: colors.danger, fontWeight: '600', fontSize: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  editSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: 24, paddingBottom: 40 },
  editTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 14 },
  editInput: { backgroundColor: colors.surface2, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text, marginBottom: 16 },
  editSaveBtn: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: 14, alignItems: 'center', ...shadows.btn },
  editSaveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  postBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  postViewer: { width: '90%', alignItems: 'center' },
  postViewerImg: { width: '100%', aspectRatio: 1, borderRadius: radii.lg },
  postCaption: { color: '#fff', fontSize: 14, marginTop: 12, textAlign: 'center' },
});
