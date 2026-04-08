import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Modal, Pressable, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, radii, shadows } from '../theme';
import { useQuizStore } from '../store/useQuizStore';

const CATEGORY_LABELS: Record<string, string> = {
  personality:   '🧠 Личность',
  relationships: '💞 Отношения',
  lifestyle:     '☀️ Стиль жизни',
  travel:        '✈️ Путешествия',
  values:        '⭐ Ценности',
  entertainment: '🎬 Развлечения',
  career:        '💼 Карьера',
  food:          '🍕 Еда',
  technology:    '💻 Технологии',
  nature:        '🌿 Природа',
  education:     '📚 Образование',
  preferences:   '🤔 Предпочтения',
};

export function QuizModal() {
  const { pending, loading, submitAnswer, dismissQuestion } = useQuizStore();
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const visible = !!pending;

  useEffect(() => {
    if (visible) {
      setSelected(null);
      setAnswered(false);
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1,   useNativeDriver: true, damping: 20, stiffness: 220 }),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleSelect = useCallback((idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    setTimeout(() => {
      submitAnswer(pending!.id, idx);
    }, 700);
  }, [answered, pending, submitAnswer]);

  const dismiss = useCallback(() => dismissQuestion(), [dismissQuestion]);

  if (!visible) return null;

  const catLabel = CATEGORY_LABELS[pending!.category] ?? '❓ Вопрос';

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={answered ? dismiss : undefined}>
        <Animated.View
          style={[s.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
          // prevent backdrop press from passing through card
        >
          <Pressable>
            {/* Header */}
            <View style={s.header}>
              <View style={s.categoryBadge}>
                <Text style={s.categoryTxt}>{catLabel}</Text>
              </View>
              {answered && (
                <TouchableOpacity onPress={dismiss} style={s.closeBtn} hitSlop={12}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M18 6L6 18M6 6l12 12" stroke={colors.textMuted} strokeWidth="2.2" strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            {/* Question icon */}
            <View style={s.iconWrap}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" fill={colors.accentSoft} />
                <Path d="M12 8a2 2 0 011.5 3.33L12 13v1M12 17h.01" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
              </Svg>
            </View>

            {/* Question text */}
            <Text style={s.question}>{pending!.text}</Text>

            {/* Answer options */}
            <View style={s.options}>
              {pending!.options.map((opt, idx) => {
                const isSelected  = selected === idx;
                const isDimmed    = answered && !isSelected;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      s.option,
                      isSelected && s.optionSelected,
                      isDimmed   && s.optionDimmed,
                    ]}
                    onPress={() => handleSelect(idx)}
                    activeOpacity={0.75}
                    disabled={answered}
                  >
                    <View style={[s.optionDot, isSelected && s.optionDotSelected]}>
                      {isSelected && (
                        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                          <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      )}
                    </View>
                    <Text style={[s.optionTxt, isSelected && s.optionTxtSelected]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Answered state */}
            {answered && (
              <View style={s.answeredRow}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path d="M20 6L9 17l-5-5" stroke={colors.success ?? '#22C55E'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={s.answeredTxt}>Ответ сохранён! Влияет на совместимость ★</Text>
              </View>
            )}

            {/* Skip */}
            {!answered && (
              <TouchableOpacity style={s.skipBtn} onPress={dismiss}>
                <Text style={s.skipTxt}>Пропустить</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,22,35,0.55)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  card: {
    width: '100%', maxWidth: 420, backgroundColor: colors.surface,
    borderRadius: radii.xl, padding: 24, ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  categoryBadge: { backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.pill },
  categoryTxt: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  closeBtn: { padding: 4 },
  iconWrap: { alignItems: 'center', marginBottom: 12 },
  question: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', lineHeight: 26, marginBottom: 22 },
  options: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface2, borderRadius: radii.md,
    paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  optionSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  optionDimmed: { opacity: 0.4 },
  optionDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  optionDotSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  optionTxt: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  optionTxtSelected: { color: colors.accent, fontWeight: '700' },
  answeredRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18, justifyContent: 'center' },
  answeredTxt: { color: colors.textMuted, fontSize: 13 },
  skipBtn: { marginTop: 16, alignItems: 'center' },
  skipTxt: { color: colors.textMuted, fontSize: 14 },
});
