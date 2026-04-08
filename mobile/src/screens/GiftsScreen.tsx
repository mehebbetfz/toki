import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { colors, radii } from '../theme';
import { getGifts, Gift, orderGift } from '../api/client';

const FALLBACK_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="9" width="18" height="13" rx="2" stroke="#FF6B2C" strokeWidth="1.8"/>
  <path d="M12 9v13M3 13h18M8 9c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#FF6B2C" strokeWidth="1.8" strokeLinecap="round"/>
</svg>`;

function GiftCard({
  gift,
  onBuy,
}: {
  gift: Gift;
  onBuy: (g: Gift) => void;
}) {
  const svg = gift.svgIconMarkup || FALLBACK_SVG;
  return (
    <View style={s.card}>
      <View style={s.iconWrap}>
        <SvgXml xml={svg} width={48} height={48} />
      </View>
      <Text style={s.giftName}>{gift.name}</Text>
      <Text style={s.giftDesc} numberOfLines={2}>{gift.description}</Text>
      <TouchableOpacity style={s.buyBtn} onPress={() => onBuy(gift)}>
        <Text style={s.buyBtnText}>${gift.priceUsd.toFixed(2)}</Text>
        <Text style={s.buyBtnSub}>Подарить</Text>
      </TouchableOpacity>
    </View>
  );
}

export function GiftsScreen() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [recipientId, setRecipientId] = useState('');
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    getGifts()
      .then(setGifts)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = useCallback((gift: Gift) => {
    setSelectedGift(gift);
    setRecipientId('');
  }, []);

  const confirmOrder = useCallback(async () => {
    if (!selectedGift || !recipientId.trim()) return;
    setOrdering(true);
    try {
      await orderGift(selectedGift.id, recipientId.trim());
      setSelectedGift(null);
      Alert.alert('Готово', `Подарок «${selectedGift.name}» отправлен.`);
    } catch (e) {
      Alert.alert('Ошибка', String(e));
    } finally {
      setOrdering(false);
    }
  }, [selectedGift, recipientId]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Магазин подарков</Text>
        <Text style={s.sub}>Порадуй кого-то рядом</Text>
      </View>

      {error && <Text style={s.error}>{error}</Text>}

      {gifts.length === 0 && !error && (
        <View style={s.empty}>
          <Text style={s.emptyText}>Пока нет подарков</Text>
          <Text style={s.emptyHint}>Администратор ещё не добавил позиции</Text>
        </View>
      )}

      <FlatList
        data={gifts}
        numColumns={2}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GiftCard gift={item} onBuy={handleBuy} />}
        contentContainerStyle={s.grid}
        columnWrapperStyle={{ gap: 12 }}
      />

      {/* Buy modal */}
      <Modal visible={!!selectedGift} transparent animationType="slide">
        <Pressable style={s.backdrop} onPress={() => setSelectedGift(null)} />
        <View style={s.sheet}>
          {selectedGift && (
            <ScrollView>
              <View style={s.sheetIcon}>
                <SvgXml xml={selectedGift.svgIconMarkup || FALLBACK_SVG} width={72} height={72} />
              </View>
              <Text style={s.sheetTitle}>{selectedGift.name}</Text>
              <Text style={s.sheetDesc}>{selectedGift.description}</Text>
              <Text style={s.sheetPrice}>${selectedGift.priceUsd.toFixed(2)}</Text>

              <Text style={s.label}>ID получателя (из профиля)</Text>
              <TextInput
                style={s.textInput}
                value={recipientId}
                onChangeText={setRecipientId}
                placeholder="userId..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <Text style={s.hint}>В продакшне используйте Stripe/IAP вместо прямого ID</Text>

              <TouchableOpacity
                style={[s.confirmBtn, (!recipientId.trim() || ordering) && s.confirmBtnDisabled]}
                onPress={() => void confirmOrder()}
                disabled={!recipientId.trim() || ordering}
              >
                {ordering
                  ? <ActivityIndicator color={colors.text} />
                  : <Text style={s.confirmBtnText}>Подарить за ${selectedGift.priceUsd.toFixed(2)}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  error: { color: colors.danger, paddingHorizontal: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptyHint: { color: colors.textMuted, fontSize: 14, marginTop: 8, textAlign: 'center' },
  grid: { paddingHorizontal: 20, paddingBottom: 32 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  giftName: { color: colors.text, fontWeight: '600', fontSize: 15, textAlign: 'center' },
  giftDesc: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  buyBtn: {
    marginTop: 12,
    backgroundColor: colors.accentDim,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  buyBtnText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  buyBtnSub: { color: colors.text, fontSize: 11, opacity: 0.85 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  sheetIcon: { alignItems: 'center', marginBottom: 12 },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  sheetDesc: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  sheetPrice: { color: colors.accent, fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  label: { color: colors.textMuted, fontSize: 13, marginTop: 20, marginBottom: 6 },
  textInput: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 6, lineHeight: 16 },
  confirmBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
