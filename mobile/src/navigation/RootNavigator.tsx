import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { TabNavigator } from './TabNavigator';
import { ChatScreen } from '../screens/ChatScreen';
import { CallScreen } from '../screens/CallScreen';
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
    </Stack.Navigator>
  );
}
