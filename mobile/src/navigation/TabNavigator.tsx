import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';
import { NearbyScreen } from '../screens/NearbyScreen';
import { GiftsScreen } from '../screens/GiftsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function RadarTabIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5" />
      <Circle cx="12" cy="12" r="2" fill={color} />
    </Svg>
  );
}

function GiftTabIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="9" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8" />
      <Path d="M12 9v13M3 13h18M8 9c0-2 1.8-4 4-4s4 2 4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function ProfileTabIcon({ color }: { color: string }) {
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
          height: 60,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Nearby"
        component={NearbyScreen}
        options={{
          tabBarLabel: 'Рядом',
          tabBarIcon: ({ color }) => <RadarTabIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Gifts"
        component={GiftsScreen}
        options={{
          tabBarLabel: 'Подарки',
          tabBarIcon: ({ color }) => <GiftTabIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Профиль',
          tabBarIcon: ({ color }) => <ProfileTabIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
