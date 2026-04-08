import type { NearbyUser } from '../api/client';

/** 10 фиктивных пользователей для демонстрации карты. */
export interface MockUser extends NearbyUser {
  latitude: number;
  longitude: number;
  compatibility: number; // 0–5
  avatarInitials: string;
  avatarColor: string;
  age: number;
  hobbies: string[];
}

const palette = ['#5B6EF5', '#1DC8A8', '#F05A7E', '#F5A623', '#A78BFA', '#34C97A', '#F97316', '#06B6D4', '#E879F9', '#84CC16'];

/** Базовые координаты — Баку, центр. Замените на реальные. */
const BASE_LAT = 40.4093;
const BASE_LON = 49.8671;

function offset(meters: number): number {
  return (meters / 111_320) * (Math.random() < 0.5 ? 1 : -1);
}

export const MOCK_USERS: MockUser[] = [
  { id: 'mock1', displayName: 'Арья К.', wantsToChat: true, latitude: BASE_LAT + offset(40), longitude: BASE_LON + offset(55), compatibility: 5, avatarInitials: 'АК', avatarColor: palette[0], age: 24, hobbies: ['Фотография', 'Музыка', 'Йога'] },
  { id: 'mock2', displayName: 'Дариус Э.', wantsToChat: true, latitude: BASE_LAT + offset(70), longitude: BASE_LON + offset(30), compatibility: 4, avatarInitials: 'ДЭ', avatarColor: palette[1], age: 28, hobbies: ['Кино', 'Программирование'] },
  { id: 'mock3', displayName: 'Лейла М.', wantsToChat: true, latitude: BASE_LAT + offset(20), longitude: BASE_LON + offset(80), compatibility: 4.5, avatarInitials: 'ЛМ', avatarColor: palette[2], age: 22, hobbies: ['Танцы', 'Путешествия'] },
  { id: 'mock4', displayName: 'Нилуфар Р.', wantsToChat: true, latitude: BASE_LAT + offset(90), longitude: BASE_LON + offset(15), compatibility: 3, avatarInitials: 'НР', avatarColor: palette[3], age: 26, hobbies: ['Кулинария', 'Чтение'] },
  { id: 'mock5', displayName: 'Камаль Б.', wantsToChat: true, latitude: BASE_LAT + offset(60), longitude: BASE_LON + offset(65), compatibility: 2.5, avatarInitials: 'КБ', avatarColor: palette[4], age: 31, hobbies: ['Спорт', 'Автомобили'] },
  { id: 'mock6', displayName: 'Сабина Г.', wantsToChat: true, latitude: BASE_LAT + offset(35), longitude: BASE_LON + offset(42), compatibility: 5, avatarInitials: 'СГ', avatarColor: palette[5], age: 23, hobbies: ['Арт', 'Кафе', 'Музыка'] },
  { id: 'mock7', displayName: 'Тимур Ф.', wantsToChat: true, latitude: BASE_LAT + offset(85), longitude: BASE_LON + offset(50), compatibility: 3.5, avatarInitials: 'ТФ', avatarColor: palette[6], age: 29, hobbies: ['Гейминг', 'Фитнес'] },
  { id: 'mock8', displayName: 'Хамида Ю.', wantsToChat: true, latitude: BASE_LAT + offset(15), longitude: BASE_LON + offset(70), compatibility: 4, avatarInitials: 'ХЮ', avatarColor: palette[7], age: 25, hobbies: ['Книги', 'Медитация'] },
  { id: 'mock9', displayName: 'Омар Д.', wantsToChat: true, latitude: BASE_LAT + offset(50), longitude: BASE_LON + offset(90), compatibility: 2, avatarInitials: 'ОД', avatarColor: palette[8], age: 33, hobbies: ['Музыка', 'Путешествия'] },
  { id: 'mock10', displayName: 'Зарина Н.', wantsToChat: true, latitude: BASE_LAT + offset(75), longitude: BASE_LON + offset(25), compatibility: 4.5, avatarInitials: 'ЗН', avatarColor: palette[9], age: 27, hobbies: ['Дизайн', 'Фото', 'Кино'] },
];
