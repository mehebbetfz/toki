import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authFetch } from '../api/client';

const QUIZ_LAST_KEY   = 'quiz_last_shown';
const QUIZ_ANSWERS_KEY = 'quiz_answers';
const HOUR_MS = 60 * 60 * 1000;

// ─── For dev/demo: show modal every 2 minutes instead of every hour ──────────
const INTERVAL_MS = __DEV__ ? 2 * 60 * 1000 : HOUR_MS;

export interface QuizQuestion {
  id: string;
  text: string;
  category: string;
  options: string[];
}

export interface QuizAnswer {
  questionId: string;
  answerIndex: number;
  answeredAt: number;
}

interface QuizState {
  answers: Record<string, QuizAnswer>; // questionId -> answer
  lastShownAt: number;                 // timestamp ms
  pending: QuizQuestion | null;        // current question to show
  loading: boolean;

  init: () => Promise<void>;
  fetchNextQuestion: () => Promise<void>;
  submitAnswer: (questionId: string, answerIndex: number) => Promise<void>;
  dismissQuestion: () => void;
  shouldShowNow: () => boolean;
  markShown: () => void;

  // Compatibility helpers (for mock users — local calculation)
  getCompatibilityScore: (theirAnswers: Record<string, number>) => number; // 0-5 stars
}

// ─── Mock "other user" answers for compatibility demo ────────────────────────
export const MOCK_COMPATIBILITY_ANSWERS: Record<string, Record<string, number>> = {
  mock1: { q_pers_0: 0, q_pers_1: 2, q_rel_0: 1, q_life_0: 0, q_ent_0: 2 },
  mock2: { q_pers_0: 3, q_pers_1: 0, q_rel_0: 3, q_life_0: 3, q_ent_0: 0 },
  mock3: { q_pers_0: 0, q_pers_1: 2, q_rel_0: 1, q_life_0: 1, q_ent_0: 2 },
  mock4: { q_pers_0: 2, q_pers_1: 1, q_rel_0: 0, q_life_0: 2, q_ent_0: 1 },
  mock5: { q_pers_0: 1, q_pers_1: 3, q_rel_0: 2, q_life_0: 0, q_ent_0: 3 },
};

export const useQuizStore = create<QuizState>((set, get) => ({
  answers: {},
  lastShownAt: 0,
  pending: null,
  loading: false,

  init: async () => {
    const [lastRaw, answersRaw] = await Promise.all([
      AsyncStorage.getItem(QUIZ_LAST_KEY),
      AsyncStorage.getItem(QUIZ_ANSWERS_KEY),
    ]);
    set({
      lastShownAt: lastRaw ? parseInt(lastRaw, 10) : 0,
      answers: answersRaw ? JSON.parse(answersRaw) : {},
    });
  },

  fetchNextQuestion: async () => {
    set({ loading: true });
    try {
      const res = await authFetch('/api/questions/next');
      if (res.status === 204) { set({ loading: false, pending: null }); return; }
      if (!res.ok) throw new Error('Failed');
      const q: QuizQuestion = await res.json();
      set({ pending: q, loading: false });
    } catch {
      // Fallback to a local question if API unavailable
      set({ loading: false, pending: LOCAL_FALLBACK[Math.floor(Math.random() * LOCAL_FALLBACK.length)] });
    }
  },

  submitAnswer: async (questionId, answerIndex) => {
    const answer: QuizAnswer = { questionId, answerIndex, answeredAt: Date.now() };
    const answers = { ...get().answers, [questionId]: answer };
    set({ answers, pending: null });
    await AsyncStorage.setItem(QUIZ_ANSWERS_KEY, JSON.stringify(answers));

    // Push to backend (fire and forget)
    authFetch(`/api/questions/${questionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answerIndex }),
    }).catch(() => {});
  },

  dismissQuestion: () => set({ pending: null }),

  shouldShowNow: () => {
    const { lastShownAt } = get();
    return Date.now() - lastShownAt >= INTERVAL_MS;
  },

  markShown: () => {
    const now = Date.now();
    set({ lastShownAt: now });
    AsyncStorage.setItem(QUIZ_LAST_KEY, String(now));
  },

  getCompatibilityScore: (theirAnswers) => {
    const { answers } = get();
    const myMap: Record<string, number> = {};
    for (const [qId, a] of Object.entries(answers)) myMap[qId] = a.answerIndex;

    const sharedIds = Object.keys(myMap).filter(id => id in theirAnswers);
    if (sharedIds.length === 0) return 2.5; // default neutral
    const matched = sharedIds.filter(id => myMap[id] === theirAnswers[id]).length;
    const ratio = matched / sharedIds.length; // 0-1
    return Math.round(ratio * 10) / 2; // 0-5 with 0.5 step
  },
}));

// ─── Local fallback questions (shown when backend is unreachable) ─────────────
const LOCAL_FALLBACK: QuizQuestion[] = [
  { id: 'local_1', text: 'Вы жаворонок или сова?',                            category: 'lifestyle',     options: ['Жаворонок', 'Скорее жаворонок', 'Скорее сова', 'Сова'] },
  { id: 'local_2', text: 'Что важнее в партнёре?',                            category: 'relationships', options: ['Внешность', 'Характер', 'Интеллект', 'Чувство юмора'] },
  { id: 'local_3', text: 'Какой жанр фильмов любите?',                        category: 'entertainment', options: ['Драма', 'Комедия', 'Фантастика', 'Триллер'] },
  { id: 'local_4', text: 'Вы интроверт или экстраверт?',                      category: 'personality',   options: ['Интроверт', 'Скорее интроверт', 'Скорее экстраверт', 'Экстраверт'] },
  { id: 'local_5', text: 'Вы предпочитаете пляж или горы?',                   category: 'travel',        options: ['Пляж', 'Горы', 'Лес', 'Город'] },
  { id: 'local_6', text: 'Что важнее в жизни?',                               category: 'values',        options: ['Семья', 'Карьера', 'Здоровье', 'Свобода'] },
  { id: 'local_7', text: 'Как заряжаетесь после тяжёлого дня?',               category: 'lifestyle',     options: ['Побуду один(а)', 'Пообщаюсь с близкими', 'Займусь спортом', 'Сериал' ] },
  { id: 'local_8', text: 'Как часто занимаетесь спортом?',                    category: 'lifestyle',     options: ['Ежедневно', '3–5 раз в неделю', '1–2 раза', 'Редко'] },
  { id: 'local_9', text: 'Что нравится больше: читать книги или смотреть кино?', category: 'preferences', options: ['Читать книги', 'Смотреть кино', 'Оба одинаково', 'Ни то, ни другое'] },
  { id: 'local_10', text: 'Вы планируете заранее или спонтанны?',              category: 'personality',   options: ['Всегда планирую', 'Чаще планирую', 'Чаще спонтанно', 'Полная спонтанность'] },
];
