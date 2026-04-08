import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * URL API в dev:
 * - Физическое устройство: берётся IP из Metro (hostUri), тот же ПК, что и dotnet.
 * - Android Emulator: http://10.0.2.2:5094 → хост Windows/macOS.
 * - Симулятор iOS на Mac: обычно localhost.
 * Переопределение: в корне mobile файл .env с EXPO_PUBLIC_API_URL=http://192.168.x.x:5094
 */
function resolveDevApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim().replace(/\/$/, '');
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5094`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5094';
  }

  return 'http://localhost:5094';
}

export const API_BASE_URL = __DEV__ ? resolveDevApiBaseUrl() : 'https://your-api.example.com';

if (__DEV__) {
  console.log('[Toki] API_BASE_URL =', API_BASE_URL);
}
