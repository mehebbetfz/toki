import { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii } from '../theme';
import { useSignalR } from '../hooks/useSignalR';

type Props = NativeStackScreenProps<RootStackParamList, 'Call'>;

type CallStatus = 'ringing' | 'active' | 'ended' | 'rejected';

export function CallScreen({ route, navigation }: Props) {
  const { targetUserId, targetName, mode } = route.params;
  const { connRef, connected } = useSignalR('call');
  const [status, setStatus] = useState<CallStatus>('ringing');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  // Tick duration counter
  useEffect(() => {
    if (status !== 'active') return;
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // Listen for incoming signals
  useEffect(() => {
    if (!connRef.current) return;
    const conn = connRef.current;

    conn.on('Answer', (data: { fromUserId: string; sdp: string }) => {
      if (data.fromUserId === targetUserId) setStatus('active');
    });

    conn.on('CallEnded', (data: { fromUserId: string }) => {
      if (data.fromUserId === targetUserId) {
        setStatus('ended');
        setTimeout(() => navigation.goBack(), 1500);
      }
    });

    return () => {
      conn.off('Answer');
      conn.off('CallEnded');
    };
  }, [connRef, targetUserId, navigation]);

  // Initiate call when connected
  useEffect(() => {
    if (!connected || !connRef.current) return;
    connRef.current
      .invoke('SendOffer', targetUserId, JSON.stringify({ type: 'offer', sdp: 'stub-sdp', mode }))
      .catch(console.warn);
  }, [connected, connRef, targetUserId, mode]);

  const hangUp = useCallback(async () => {
    try { await connRef.current?.invoke('NotifyCallEnded', targetUserId); } catch {}
    setStatus('ended');
    setTimeout(() => navigation.goBack(), 800);
  }, [connRef, targetUserId, navigation]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const statusLabel: Record<CallStatus, string> = {
    ringing: 'Вызов...',
    active: formatDuration(duration),
    ended: 'Звонок завершён',
    rejected: 'Отклонено',
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{targetName.charAt(0).toUpperCase()}</Text>
        </View>

        <Text style={s.name}>{targetName}</Text>
        <Text style={s.status}>{statusLabel[status]}</Text>
        {mode === 'video' && <Text style={s.modeTag}>Видеозвонок</Text>}

        {/* Video placeholder */}
        {mode === 'video' && status === 'active' && !cameraOff && (
          <View style={s.videoBox}>
            <Svg width={60} height={60} viewBox="0 0 24 24" fill="none">
              <Path d="M23 7l-7 5 7 5V7z" stroke={colors.accent} strokeWidth="2" />
              <Path d="M1 5h15a2 2 0 012 2v10a2 2 0 01-2 2H1a2 2 0 01-2-2V7a2 2 0 012-2z" stroke={colors.accent} strokeWidth="2" />
            </Svg>
            <Text style={s.videoHint}>WebRTC — подключите expo-camera + RTCPeerConnection</Text>
          </View>
        )}

        <View style={s.controls}>
          {/* Mute */}
          <TouchableOpacity style={[s.ctrlBtn, muted && s.ctrlBtnActive]} onPress={() => setMuted((v) => !v)}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke={muted ? colors.danger : colors.text} strokeWidth="2" />
              <Path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke={muted ? colors.danger : colors.text} strokeWidth="2" strokeLinecap="round" />
            </Svg>
            <Text style={[s.ctrlLabel, muted && { color: colors.danger }]}>{muted ? 'Мик выкл' : 'Мик вкл'}</Text>
          </TouchableOpacity>

          {/* Camera (video only) */}
          {mode === 'video' && (
            <TouchableOpacity style={[s.ctrlBtn, cameraOff && s.ctrlBtnActive]} onPress={() => setCameraOff((v) => !v)}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                <Path d="M23 7l-7 5 7 5V7z" stroke={cameraOff ? colors.danger : colors.text} strokeWidth="2" />
                <Path d="M1 5h15a2 2 0 012 2v10a2 2 0 01-2 2H1" stroke={cameraOff ? colors.danger : colors.text} strokeWidth="2" strokeLinecap="round" />
              </Svg>
              <Text style={[s.ctrlLabel, cameraOff && { color: colors.danger }]}>{cameraOff ? 'Камера выкл' : 'Камера вкл'}</Text>
            </TouchableOpacity>
          )}

          {/* Hang up */}
          <TouchableOpacity style={s.hangUpBtn} onPress={() => void hangUp()}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
              <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 11.4a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.05 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" fill={colors.bg} stroke={colors.bg} />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarText: { color: colors.accent, fontSize: 40, fontWeight: '700' },
  name: { color: colors.text, fontSize: 26, fontWeight: '700', marginTop: 20 },
  status: { color: colors.textMuted, fontSize: 16, marginTop: 8 },
  modeTag: {
    backgroundColor: colors.surface2,
    color: colors.accent,
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    marginTop: 8,
    overflow: 'hidden',
  },
  videoBox: {
    marginTop: 24,
    width: '100%',
    height: 160,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  videoHint: { color: colors.textMuted, fontSize: 11, textAlign: 'center', maxWidth: 240 },
  controls: { flexDirection: 'row', marginTop: 48, gap: 20, alignItems: 'flex-end' },
  ctrlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  ctrlBtnActive: { borderColor: colors.danger },
  ctrlLabel: { color: colors.textMuted, fontSize: 10 },
  hangUpBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.danger,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
