import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, shadows } from '../theme';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileSettingsStore } from '../store/useProfileSettingsStore';

function Row({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" />
    </View>
  );
}

export function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const fields = useProfileSettingsStore(st => st.fields);
  const setFields = useProfileSettingsStore(st => st.setFields);
  const showGifts = useProfileSettingsStore(st => st.showGifts);
  const setShowGifts = useProfileSettingsStore(st => st.setShowGifts);
  const showFavCount = useProfileSettingsStore(st => st.showFavCount);
  const setShowFavCount = useProfileSettingsStore(st => st.setShowFavCount);
  const hideOnline = useProfileSettingsStore(st => st.hideOnline);
  const setHideOnline = useProfileSettingsStore(st => st.setHideOnline);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Настройки</Text>

        <Text style={s.sectionTitle}>Конфиденциальность</Text>
        <View style={s.card}>
          <Row
            label="Показывать возраст"
            value={fields.find(f => f.key === 'age')?.visible ?? true}
            onToggle={() => setFields(p => p.map(f => f.key === 'age' ? { ...f, visible: !f.visible } : f))}
          />
          <Row
            label="Показывать город"
            value={fields.find(f => f.key === 'city')?.visible ?? true}
            onToggle={() => setFields(p => p.map(f => f.key === 'city' ? { ...f, visible: !f.visible } : f))}
          />
          <Row
            label="Показывать работу"
            value={fields.find(f => f.key === 'occupation')?.visible ?? true}
            onToggle={() => setFields(p => p.map(f => f.key === 'occupation' ? { ...f, visible: !f.visible } : f))}
          />
          <Row label="Показывать подарки" value={showGifts} onToggle={() => setShowGifts(!showGifts)} />
          <Row label="Показывать кол-во избранных" value={showFavCount} onToggle={() => setShowFavCount(!showFavCount)} />
          <Row label="Скрыть статус «онлайн»" value={hideOnline} onToggle={() => setHideOnline(!hideOnline)} />
        </View>

        <Text style={[s.sectionTitle, { marginTop: 28 }]}>Аккаунт</Text>
        <View style={s.card}>
          <View style={s.idBlock}>
            <Text style={s.idLabel}>Твой ID</Text>
            <Text selectable style={s.idVal}>{user?.id ?? '—'}</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={() => void logout()} activeOpacity={0.85}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={colors.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={s.logoutTxt}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.text, fontSize: 15, flex: 1, paddingRight: 12 },
  idBlock: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  idLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  idVal: { color: colors.accent, fontSize: 13 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  logoutTxt: { color: colors.danger, fontWeight: '600', fontSize: 16 },
});
