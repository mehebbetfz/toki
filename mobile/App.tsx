import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
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
  const [initializing, setInitializing] = useState(true);

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
      ) : (
        <AuthScreen />
      )}
    </SafeAreaProvider>
  );
}
