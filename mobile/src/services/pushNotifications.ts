import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { authFetch } from '../api/client';

// ── Configure foreground notification behaviour ───────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Register push token and send it to the backend ───────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Push notification permission not granted');
    return null;
  }

  // Required on Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Toki',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5B6EF5',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'toki', // update with your real Expo project ID when deploying
    });
    const token = tokenData.data;
    await sendTokenToBackend(token);
    return token;
  } catch (err) {
    console.warn('[Push] Could not get push token:', err);
    return null;
  }
}

async function sendTokenToBackend(token: string) {
  try {
    await authFetch('/api/devices/push-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.warn('[Push] Failed to send token to backend:', err);
  }
}

// ── Notification response handler (e.g., navigate to chat on tap) ────────────
export function setupNotificationResponseHandler(
  onMessage: (conversationId: string, senderUserId: string) => void,
  onNearby:  (userId: string) => void,
) {
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as Record<string, string>;
    if (data?.type === 'message' && data.conversationId) {
      onMessage(data.conversationId, data.senderUserId);
    }
    if (data?.type === 'nearby' && data.userId) {
      onNearby(data.userId);
    }
  });
  return () => sub.remove();
}
