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
  posts: string[]; // preview image URIs (up to 3)
}

const palette = ['#5B6EF5', '#1DC8A8', '#F05A7E', '#F5A623', '#A78BFA', '#34C97A', '#F97316', '#06B6D4', '#E879F9', '#84CC16'];

/** Базовые координаты — Баку, центр. Замените на реальные. */
const BASE_LAT = 40.4093;
const BASE_LON = 49.8671;

function offset(meters: number): number {
  return (meters / 111_320) * (Math.random() < 0.5 ? 1 : -1);
}

const seeds = [
  ['a1','a2','a3'],['b1','b2'],['c1','c2','c3'],['d1','d2','d3'],['e1'],
  ['f1','f2','f3'],['g1','g2'],['h1','h2','h3'],['i1'],['j1','j2','j3'],
];

export const MOCK_USERS: MockUser[] = [
  { id: 'mock1',  displayName: 'Арья К.',    wantsToChat: true, latitude: BASE_LAT + offset(40), longitude: BASE_LON + offset(55), compatibility: 5,   avatarInitials: 'АК', avatarColor: palette[0], age: 24, hobbies: ['Фотография', 'Музыка', 'Йога'],        posts: seeds[0].map(s=>`https://picsum.photos/seed/${s}/200/200`) },
  { id: 'mock2',  displayName: 'Дариус Э.',  wantsToChat: true, latitude: BASE_LAT + offset(70), longitude: BASE_LON + offset(30), compatibility: 4,   avatarInitials: 'ДЭ', avatarColor: palette[1], age: 28, hobbies: ['Кино', 'Программирование'],          posts: seeds[1].map(s=>`https://picsum.photos/seed/${s}/200/200`) },
  { id: 'mock3',  displayName: 'Лейла М.',   wantsToChat: true, latitude: BASE_LAT + offset(20), longitude: BASE_LON + offset(80), compatibility: 4.5, avatarInitials: 'ЛМ', avatarColor: palette[2], age: 22, hobbies: ['Танцы', 'Путешествия'],             posts: seeds[2].map(s=>`https://picsum.photos/seed/${s}/200/200`) },
  { id: 'mock4',  displayName: 'Нилуфар Р.', wantsToChat: true, latitude: BASE_LAT + offset(90), longitude: BASE_LON + offset(15), compatibility: 3,   avatarInitials: 'НР', avatarColor: palette[3], age: 26, hobbies: ['Кулинария', 'Чтение'],             posts: seeds[3].map(s=>`https://picsum.photos/seed/${s}/200/200`) },
  { id: 'mock5',  displayName: 'Камаль Б.',  wantsToChat: true, latitude: BASE_LAT + offset(60), longitude: BASE_LON + offset(65), compatibility: 2.5, avatarInitials: 'КБ', avatarColor: palette[4], age: 31, hobbies: ['Спорт', 'Автомобили'],              posts: seeds[4].map(s=>`https://picsum.photos/seed/${s}/200/200`) },
  { id: 'mock6',  displayName: 'Сабина Г.',  wantsToChat: true, latitude: BASE_LAT + offset(35), longitude: BASE_LON + offset(42), compatibility: 5,   avatarInitials: 'СГ', avatarColor: palette[5], age: 23, hobbies: ['Арт', 'Кафе', 'Музыка'],           posts: seeds[5].map(s=>`https://picsum.photos/seed/${s}/200/200`) },
  { id: 'mock7',  displayName: 'Тимур Ф.',   wantsToChat: true, latitude: BASE_LAT + offset(85), longitude: BASE_LON + offset(50), compatibility: 3.5, avatarInitials: 'ТФ', avatarColor: palette[6], age: 29, hobbies: ['Гейминг', 'Фитнес'],               posts: seeds[6].map(s=>`https://picsum.photos/seed/${s}/200/200`) },
  { id: 'mock8',  displayName: 'Хамида Ю.',  wantsToChat: true, latitude: BASE_LAT + offset(15), longitude: BASE_LON + offset(70), compatibility: 4,   avatarInitials: 'ХЮ', avatarColor: palette[7], age: 25, hobbies: ['Книги', 'Медитация'],              posts: seeds[7].map(s=>`https://picsum.photos/seed/${s}/200/200`) },
  { id: 'mock9',  displayName: 'Омар Д.',    wantsToChat: true, latitude: BASE_LAT + offset(50), longitude: BASE_LON + offset(90), compatibility: 2,   avatarInitials: 'ОД', avatarColor: palette[8], age: 33, hobbies: ['Музыка', 'Путешествия'],           posts: seeds[8].map(s=>`https://picsum.photos/seed/${s}/200/200`) },
  { id: 'mock10', displayName: 'Зарина Н.',  wantsToChat: true, latitude: BASE_LAT + offset(75), longitude: BASE_LON + offset(25), compatibility: 4.5, avatarInitials: 'ЗН', avatarColor: palette[9], age: 27, hobbies: ['Дизайн', 'Фото', 'Кино'],          posts: seeds[9].map(s=>`https://picsum.photos/seed/${s}/200/200`) },
];
