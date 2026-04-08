import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme';
import { MapScreen } from '../screens/MapScreen';
import { NearbyScreen } from '../screens/NearbyScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GiftsScreen } from '../screens/GiftsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function MapIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function RadarIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5" />
      <Circle cx="12" cy="12" r="2" fill={color} />
    </Svg>
  );
}

function ChatIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </Svg>
  );
}

function GiftIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="9" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8" />
      <Path d="M12 9v13M3 13h18M8 9c0-2 1.8-4 4-4s4 2 4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
      <Path d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 4,
          height: 64,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarLabel: 'Карта', tabBarIcon: ({ color }) => <MapIcon color={color} /> }}
      />
      <Tab.Screen
        name="Nearby"
        component={NearbyScreen}
        options={{ tabBarLabel: 'Рядом', tabBarIcon: ({ color }) => <RadarIcon color={color} /> }}
      />
      <Tab.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{ tabBarLabel: 'Чаты', tabBarIcon: ({ color }) => <ChatIcon color={color} /> }}
      />
      <Tab.Screen
        name="Gifts"
        component={GiftsScreen}
        options={{ tabBarLabel: 'Подарки', tabBarIcon: ({ color }) => <GiftIcon color={color} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Профиль', tabBarIcon: ({ color }) => <ProfileIcon color={color} /> }}
      />
    </Tab.Navigator>
  );
}
