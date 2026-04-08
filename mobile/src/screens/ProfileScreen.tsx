import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, radii } from '../theme';
import { useAuthStore } from '../store/useAuthStore';

function ProfileIcon({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={colors.accent} strokeWidth="1.8" />
      <Path d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={colors.accent} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.avatar}>
          <ProfileIcon size={52} />
        </View>

        <Text style={s.name}>{user?.displayName ?? '—'}</Text>
        <Text style={s.email}>{user?.email ?? ''}</Text>

        <View style={s.idCard}>
          <Text style={s.idLabel}>Твой ID (для получения подарков)</Text>
          <Text selectable style={s.idValue}>{user?.id ?? '—'}</Text>
        </View>

        <View style={s.infoSection}>
          <InfoRow label="Аккаунт" value="Почта / Google / Apple" />
          <InfoRow label="Шифрование чата" value="E2E (XOR-demo)" />
          <InfoRow label="Поиск по геолокации" value="100 м" />
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={() => void logout()}>
          <Text style={s.logoutText}>Выйти</Text>
        </TouchableOpacity>

        <Text style={s.version}>Toki v1.0.0 · Backend: ASP.NET Core 8</Text>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: 24, alignItems: 'center', paddingTop: 32 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  name: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 14 },
  email: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  idCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  idLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  idValue: { color: colors.accent, fontSize: 13, fontFamily: 'monospace' },
  infoSection: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14 },
  logoutBtn: {
    marginTop: 32,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutText: { color: colors.danger, fontWeight: '600', fontSize: 16 },
  version: { color: colors.textMuted, fontSize: 11, marginTop: 32, textAlign: 'center' },
});
