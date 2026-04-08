import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { TabNavigator } from './TabNavigator';
import { ChatScreen } from '../screens/ChatScreen';
import { CallScreen } from '../screens/CallScreen';
import { OtherUserProfileScreen } from '../screens/OtherUserProfileScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.otherName, headerBackTitle: 'Назад' })}
      />
      <Stack.Screen
        name="Call"
        component={CallScreen}
        options={{ title: 'Звонок', gestureEnabled: false }}
      />
      <Stack.Screen
        name="UserProfile"
        component={OtherUserProfileScreen}
        options={({ route }) => {
          try {
            const u = JSON.parse(route.params.userJson) as { displayName?: string };
            return { title: u.displayName ?? 'Профиль', headerBackTitle: 'Назад' };
          } catch {
            return { title: 'Профиль', headerBackTitle: 'Назад' };
          }
        }}
      />
    </Stack.Navigator>
  );
}
