import { useCallback } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { TokiLogo } from '../components/TokiLogo';
import { colors, radii } from '../theme';
import { loginApple, loginGoogle } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useState } from 'react';

// Note: замени на свой Google client id (web), зарегистрированный в Google Cloud Console
const GOOGLE_CLIENT_ID =
  'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <Rect width="48" height="48" fill="none" />
    </Svg>
  );
}

function AppleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 814 1000">
      <Path
        fill={colors.text}
        d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-148.2-117.1C46 523.4 0 405.8 0 293.2c0-193.9 126.4-296.5 250.9-296.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
      />
    </Svg>
  );
}

export function AuthScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth via expo-auth-session
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
  const [_request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'email', 'profile'],
      responseType: AuthSession.ResponseType.IdToken,
    },
    discovery,
  );

  const handleGoogleResponse = useCallback(async () => {
    if (response?.type !== 'success') return;
    const idToken = response.params.id_token;
    if (!idToken) return;
    setBusy(true);
    setError(null);
    try {
      const data = await loginGoogle(idToken);
      await setAuth(data.user, data.accessToken);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [response, setAuth]);

  // trigger handleGoogleResponse when response changes
  void (response?.type === 'success' && !busy && handleGoogleResponse());

  const onGooglePress = useCallback(() => {
    setError(null);
    promptAsync();
  }, [promptAsync]);

  const onApplePress = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) throw new Error('No Apple identity token');
      const data = await loginApple(cred.identityToken);
      await setAuth(data.user, data.accessToken);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code !== 'ERR_REQUEST_CANCELED') setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [setAuth]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <TokiLogo size={100} />
        <Text style={s.title}>Toki</Text>
        <Text style={s.tagline}>Общайся с теми, кто рядом</Text>

        <View style={s.features}>
          {['📍 Видишь людей в 100 м', '💬 Зашифрованный чат', '📞 Аудио и видео-звонки', '🎁 Подарки'].map((t) => (
            <Text key={t} style={s.feature}>{t}</Text>
          ))}
        </View>

        {busy && <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 32 }} />}
        {!busy && (
          <View style={s.buttons}>
            <Pressable style={s.btnGoogle} onPress={onGooglePress}>
              <GoogleIcon size={22} />
              <Text style={s.btnGoogleText}>Войти через Google</Text>
            </Pressable>

            {Platform.OS === 'ios' && (
              <Pressable style={s.btnApple} onPress={() => void onApplePress()}>
                <AppleIcon size={20} />
                <Text style={s.btnAppleText}>Войти через Apple</Text>
              </Pressable>
            )}
          </View>
        )}

        {error && <Text style={s.error}>{error}</Text>}

        <Text style={s.note}>
          Нажимая «Войти», вы соглашаетесь с условиями использования и политикой конфиденциальности.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 40, fontWeight: '800', color: colors.text, marginTop: 16, letterSpacing: 1.5 },
  tagline: { fontSize: 16, color: colors.textMuted, marginTop: 8, marginBottom: 32 },
  features: { width: '100%', gap: 10, marginBottom: 40 },
  feature: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  buttons: { width: '100%', gap: 14 },
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    paddingVertical: 14,
  },
  btnGoogleText: { color: '#1a1a1a', fontWeight: '600', fontSize: 16 },
  btnApple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#000',
    borderRadius: radii.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnAppleText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: colors.danger, marginTop: 16, textAlign: 'center', fontSize: 13 },
  note: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 32, lineHeight: 16 },
});
