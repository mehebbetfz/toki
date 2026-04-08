import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'toki_access_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export async function loginGoogle(idToken: string) {
  const r = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!r.ok) throw new Error(`Google auth failed: ${r.status}`);
  return r.json() as Promise<{ accessToken: string; user: TokiUser }>;
}

export async function loginApple(idToken: string) {
  const r = await fetch(`${API_BASE_URL}/api/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!r.ok) throw new Error(`Apple auth failed: ${r.status}`);
  return r.json() as Promise<{ accessToken: string; user: TokiUser }>;
}

// ─── Proximity ─────────────────────────────────────────────────────────────
export async function setProximityState(latitude: number, longitude: number, wantsToChat: boolean) {
  const r = await authFetch('/api/proximity/state', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude, wantsToChat }),
  });
  if (!r.ok) throw new Error(`Proximity state failed: ${r.status}`);
}

export async function getNearby(latitude: number, longitude: number): Promise<NearbyUser[]> {
  const r = await authFetch(`/api/proximity/nearby?latitude=${latitude}&longitude=${longitude}`);
  if (!r.ok) throw new Error(`Nearby failed: ${r.status}`);
  return r.json();
}

// ─── Messages ──────────────────────────────────────────────────────────────
export async function getConversationId(otherUserId: string): Promise<string> {
  const r = await authFetch(`/api/messages/conversation-id/${otherUserId}`);
  if (!r.ok) throw new Error(`ConvId failed: ${r.status}`);
  return r.json();
}

export async function getMessageHistory(conversationId: string, limit = 50): Promise<ChatMsg[]> {
  const r = await authFetch(`/api/messages/conversation/${conversationId}?limit=${limit}`);
  if (!r.ok) throw new Error(`History failed: ${r.status}`);
  return r.json();
}

// ─── Gifts ─────────────────────────────────────────────────────────────────
export async function getGifts(): Promise<Gift[]> {
  const r = await authFetch('/api/gifts');
  if (!r.ok) throw new Error(`Gifts failed: ${r.status}`);
  return r.json();
}

export async function orderGift(giftId: string, recipientUserId: string) {
  const r = await authFetch(`/api/gifts/${giftId}/order`, {
    method: 'POST',
    body: JSON.stringify({ recipientUserId }),
  });
  if (!r.ok) throw new Error(`Order failed: ${r.status}`);
  return r.json();
}

// ─── Types ─────────────────────────────────────────────────────────────────
export interface TokiUser {
  id: string;
  email: string;
  displayName: string;
}

export interface NearbyUser {
  id: string;
  displayName: string;
  wantsToChat: boolean;
}

export interface ChatMsg {
  id: string;
  senderUserId: string;
  ciphertextBase64: string;
  nonceBase64?: string;
  createdAtUtc: string;
}

export interface Gift {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  svgIconMarkup: string;
}
