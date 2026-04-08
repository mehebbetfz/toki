import 'react-native-gesture-handler';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme';
import { AuthScreen } from './src/screens/AuthScreen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/useAuthStore';
import { getToken, TokiUser } from './src/api/client';
import { ActivityIndicator, View } from 'react-native';
import { API_BASE_URL } from './src/config';
import { QuizModal } from './src/components/QuizModal';
import { useQuizStore } from './src/store/useQuizStore';
import { registerForPushNotificationsAsync, setupNotificationResponseHandler } from './src/services/pushNotifications';

function decodeJwtPayload(token: string): { sub: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1])) as { sub?: string; email?: string };
    if (!payload.sub) return null;
    return { sub: payload.sub, email: payload.email ?? '' };
  } catch {
    return null;
  }
}

export default function App() {
  const { isLoggedIn, setAuth } = useAuthStore();
  const { init: initQuiz, shouldShowNow, fetchNextQuestion, markShown } = useQuizStore();
  const [initializing, setInitializing] = useState(true);
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const payload = decodeJwtPayload(token);
          if (payload) {
            const user: TokiUser = {
              id: payload.sub,
              email: payload.email,
              displayName: payload.email.split('@')[0],
            };
            await setAuth(user, token);
          }
        }
      } catch {
        // No stored token or invalid — stay on auth
      } finally {
        setInitializing(false);
      }
    })();
  }, [setAuth]);

  // ── Push notifications ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    registerForPushNotificationsAsync().catch(() => {});
    const cleanup = setupNotificationResponseHandler(
      (conversationId, senderUserId) => {
        // Navigation to chat handled by notification tap — nav ref would be needed for deep link
        console.log('[Push] Navigate to chat:', conversationId);
      },
      (userId) => {
        console.log('[Push] Nearby user:', userId);
      },
    );
    return cleanup;
  }, [isLoggedIn]);

  // ── Quiz timer: check every 30 seconds if it's time to show ────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    initQuiz().then(() => {
      if (shouldShowNow()) { markShown(); fetchNextQuestion(); }
    });

    quizTimerRef.current = setInterval(() => {
      if (shouldShowNow()) { markShown(); fetchNextQuestion(); }
    }, 30_000);

    // Also check when app comes to foreground
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && shouldShowNow()) { markShown(); fetchNextQuestion(); }
    });

    return () => {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
      sub.remove();
    };
  }, [isLoggedIn]);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={colors.surface} translucent={false} />
      {isLoggedIn ? (
        <NavigationContainer
          theme={{
            dark: false,
            colors: {
              primary: colors.accent,
              background: colors.bg,
              card: colors.surface,
              text: colors.text,
              border: colors.border,
              notification: colors.accent,
            },
            fonts: {
              regular: { fontFamily: 'System', fontWeight: '400' },
              medium: { fontFamily: 'System', fontWeight: '500' },
              bold: { fontFamily: 'System', fontWeight: '700' },
              heavy: { fontFamily: 'System', fontWeight: '800' },
            },
          }}
        >
          <RootNavigator />
        </NavigationContainer>
        {/* Hourly quiz modal — renders above everything */}
        <QuizModal />
      ) : (
        <AuthScreen />
      )}
    </SafeAreaProvider>
  );
}
