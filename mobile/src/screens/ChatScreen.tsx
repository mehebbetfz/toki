import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, FlatList, Image, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { UserProfileSheet } from '../components/UserProfileSheet';
import { MOCK_USERS } from '../mocks/mockUsers';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Video, ResizeMode } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, shadows } from '../theme';
import { getConversationId, getMessageHistory, ChatMsg } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useSignalR } from '../hooks/useSignalR';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;
type MsgType = 'text' | 'image' | 'video' | 'circle_video' | 'voice';

interface LocalMsg extends ChatMsg {
  localType?: MsgType;
  localUri?: string;
  viewed?: boolean;
  durationMs?: number;
}

function encodeMsg(text: string) {
  const nonce = new Uint8Array(24);
  crypto.getRandomValues(nonce);
  const buf = new TextEncoder().encode(text);
  const ct = buf.map((b, i) => b ^ nonce[i % 24]);
  return { ciphertextBase64: btoa(String.fromCharCode(...ct)), nonceBase64: btoa(String.fromCharCode(...nonce)) };
}

function decodeMsg(ct: string, nonce?: string) {
  try {
    if (!nonce || nonce === 'voice') return null;
    const c = Uint8Array.from(atob(ct), x => x.charCodeAt(0));
    const n = Uint8Array.from(atob(nonce), x => x.charCodeAt(0));
    return new TextDecoder().decode(c.map((b, i) => b ^ n[i % 24]));
  } catch { return '[ошибка]'; }
}

function VoiceBubble({ isMine, durationMs = 3000 }: { isMine: boolean; durationMs?: number }) {
  const [playing, setPlaying] = useState(false);
  const secs = Math.ceil(durationMs / 1000);
  return (
    <View style={[cs.voiceBubble, isMine ? cs.bubbleMine : cs.bubbleOther]}>
      <TouchableOpacity onPress={() => setPlaying(v => !v)} style={cs.voicePlay}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          {playing
            ? <><Rect x="6" y="4" width="4" height="16" rx="2" fill={isMine ? '#fff' : colors.accent} /><Rect x="14" y="4" width="4" height="16" rx="2" fill={isMine ? '#fff' : colors.accent} /></>
            : <Path d="M5 3l14 9-14 9V3z" fill={isMine ? '#fff' : colors.accent} />}
        </Svg>
      </TouchableOpacity>
      <View style={cs.waveform}>
        {[3, 6, 10, 8, 14, 10, 6, 12, 8, 5, 10, 7].map((h, i) => (
          <View key={i} style={[cs.waveBar, { height: h * 2, backgroundColor: isMine ? 'rgba(255,255,255,0.7)' : colors.accent }]} />
        ))}
      </View>
      <Text style={[cs.voiceTime, isMine && { color: 'rgba(255,255,255,0.8)' }]}>{secs}с</Text>
    </View>
  );
}

export function ChatScreen({ route, navigation }: Props) {
  const { otherUserId, otherName } = route.params;
  const myId = useAuthStore(s => s.user?.id ?? '');
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Build ViewableUser from mock or minimal info
  const mockUser = MOCK_USERS.find(u => u.id === otherUserId);
  const viewableUser = {
    id: otherUserId,
    displayName: otherName,
    avatarInitials: mockUser?.avatarInitials ?? otherName.slice(0, 2).toUpperCase(),
    avatarColor: mockUser?.avatarColor,
    age: mockUser?.age,
    hobbies: mockUser?.hobbies,
    compatibility: mockUser?.compatibility,
    posts: mockUser?.posts,
  };
  const listRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { connRef, connected } = useSignalR('chat');

  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: 'Назад',
      headerTitle: () => (
        <TouchableOpacity onPress={() => setShowProfile(true)} activeOpacity={0.7} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F1623' }}>{otherName}</Text>
          <Text style={{ fontSize: 11, color: '#6B7A99' }}>нажмите для профиля</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, otherName]);

  useEffect(() => {
    (async () => {
      const id = await getConversationId(otherUserId);
      setConvId(id);
      const hist = await getMessageHistory(id);
      setMessages(hist.map(m => ({ ...m, viewed: false })));
    })();
  }, [otherUserId]);

  useEffect(() => {
    if (!convId || !connected || !connRef.current) return;
    const conn = connRef.current;
    conn.invoke('JoinConversation', convId).catch(console.warn);

    conn.on('ReceiveCipher', (data: any) => {
      setMessages(prev => [...prev, { ...data, id: data.messageId, viewed: false }]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });

    conn.on('ReceiveVoice', (data: any) => {
      const msg: LocalMsg = {
        id: data.messageId, senderUserId: data.senderUserId,
        ciphertextBase64: data.audioBase64, nonceBase64: 'voice',
        createdAtUtc: data.createdAtUtc, localType: 'voice', durationMs: data.durationMs, viewed: false,
      };
      setMessages(prev => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });

    conn.on('UserTyping', (data: { senderUserId: string }) => {
      if (data.senderUserId !== myId) {
        setIsTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => {
      conn.off('ReceiveCipher'); conn.off('ReceiveVoice'); conn.off('UserTyping');
      conn.invoke('LeaveConversation', convId).catch(() => {});
    };
  }, [convId, connected, connRef, myId]);

  const handleTextChange = useCallback((text: string) => {
    setInput(text);
    if (convId && connected && connRef.current) {
      connRef.current.invoke('SendTyping', convId).catch(() => {});
    }
  }, [convId, connected, connRef]);

  const send = useCallback(async () => {
    if (!input.trim() || !convId || !connected || !connRef.current) return;
    const { ciphertextBase64, nonceBase64 } = encodeMsg(input.trim());
    const optimistic: LocalMsg = {
      id: `opt_${Date.now()}`, senderUserId: myId,
      ciphertextBase64, nonceBase64,
      createdAtUtc: new Date().toISOString(), viewed: false,
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 30);
    try { await connRef.current.invoke('SendCipher', convId, ciphertextBase64, nonceBase64); }
    catch { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); }
  }, [input, convId, connected, connRef, myId]);

  const pickMedia = useCallback(async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85, videoMaxDuration: 30,
    });
    if (result.canceled) return;
    const msg: LocalMsg = {
      id: `local_${Date.now()}`, senderUserId: myId,
      ciphertextBase64: `[${type}]`, nonceBase64: undefined,
      createdAtUtc: new Date().toISOString(),
      localType: type, localUri: result.assets[0].uri, viewed: false,
    };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [myId]);

  const recordCircle = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, videoMaxDuration: 15 });
    if (result.canceled) return;
    const msg: LocalMsg = {
      id: `circle_${Date.now()}`, senderUserId: myId,
      ciphertextBase64: '[circle_video]', nonceBase64: undefined,
      createdAtUtc: new Date().toISOString(), localType: 'circle_video', localUri: result.assets[0].uri, viewed: false,
    };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [myId]);

  const startRecording = useCallback(async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
    } catch (e) { Alert.alert('Ошибка', String(e)); }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const status = await recording.getStatusAsync();
    setRecording(null);
    if (!uri) return;
    const durationMs = ('durationMillis' in status ? (status.durationMillis ?? 3000) : 3000);
    const msg: LocalMsg = {
      id: `voice_${Date.now()}`, senderUserId: myId,
      ciphertextBase64: uri, nonceBase64: 'voice',
      createdAtUtc: new Date().toISOString(), localType: 'voice', localUri: uri, durationMs, viewed: false,
    };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [recording, myId]);

  const handleViewOnce = useCallback((msgId: string) => {
    Alert.alert('Одноразовый просмотр', 'После просмотра медиа будет скрыто навсегда.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Открыть', onPress: () => setMessages(prev => prev.map(m => m.id === msgId ? { ...m, viewed: true } : m)) },
    ]);
  }, []);

  const renderItem = useCallback(({ item }: { item: LocalMsg }) => {
    const isMine = item.senderUserId === myId;
    const time = new Date(item.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (item.localType === 'voice' || item.nonceBase64 === 'voice') {
      return (
        <View style={{ marginBottom: 6, alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
          <VoiceBubble isMine={isMine} durationMs={item.durationMs} />
          <Text style={[cs.msgTime, isMine && cs.msgTimeMine]}>{time}</Text>
        </View>
      );
    }

    if (item.localUri && item.localType) {
      const viewed = item.viewed;
      const isCircle = item.localType === 'circle_video';
      return (
        <View style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
          {viewed ? (
            <View style={cs.viewedBubble}><Text style={cs.viewedText}>👁 Просмотрено</Text></View>
          ) : (
            <TouchableOpacity onPress={() => handleViewOnce(item.id)} activeOpacity={0.85}>
              <View style={[cs.mediaBubble, isCircle && cs.circleBubble]}>
                {item.localType === 'image'
                  ? <Image source={{ uri: item.localUri }} style={cs.imageThumb} />
                  : <View style={{ width: isCircle ? 120 : 180, height: isCircle ? 120 : 140, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
                        <Path d="M5 3l14 9-14 9V3z" fill={colors.accent} />
                      </Svg>
                    </View>}
                <View style={cs.onceBadge}><Text style={cs.onceBadgeText}>👁 1×</Text></View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    const text = decodeMsg(item.ciphertextBase64, item.nonceBase64);
    return (
      <View style={[cs.bubble, isMine ? cs.bubbleMine : cs.bubbleOther]}>
        <Text style={[cs.bubbleText, !isMine && cs.bubbleTextOther]}>{text}</Text>
        <Text style={[cs.msgTime, isMine && cs.msgTimeMine]}>{time}</Text>
      </View>
    );
  }, [myId, handleViewOnce]);

  return (
    <SafeAreaView style={cs.safe}>
      <UserProfileSheet user={showProfile ? viewableUser : null} onClose={() => setShowProfile(false)} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={cs.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={isTyping ? (
            <View style={cs.typingRow}>
              <View style={cs.typingBubble}>
                <Text style={cs.typingDots}>● ● ●</Text>
              </View>
              <Text style={cs.typingLabel}>печатает...</Text>
            </View>
          ) : null}
        />

        <View style={cs.inputRow}>
          <TouchableOpacity style={cs.mediaBtn} onPress={() => void pickMedia('image')}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Rect x="3" y="3" width="18" height="18" rx="3" stroke={colors.accent} strokeWidth="1.8" />
              <Circle cx="8.5" cy="8.5" r="1.5" fill={colors.accent} />
              <Path d="M21 15l-5-5L5 21" stroke={colors.accent} strokeWidth="1.8" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={cs.mediaBtn} onPress={() => void pickMedia('video')}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M23 7l-7 5 7 5V7z" stroke={colors.accent} strokeWidth="1.8" strokeLinejoin="round" />
              <Rect x="1" y="5" width="15" height="14" rx="2" stroke={colors.accent} strokeWidth="1.8" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={cs.circleBtn} onPress={() => void recordCircle()}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
              <Path d="M10 8l6 4-6 4V8z" fill="#fff" />
            </Svg>
          </TouchableOpacity>

          <TextInput
            style={cs.input}
            value={input}
            onChangeText={handleTextChange}
            placeholder="Сообщение..."
            placeholderTextColor={colors.textMuted}
            multiline
          />

          {input.trim() ? (
            <TouchableOpacity style={cs.sendBtn} onPress={() => void send()}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[cs.sendBtn, isRecording && cs.sendBtnRecording]}
              onPressIn={() => void startRecording()}
              onPressOut={() => void stopRecording()}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="#fff" strokeWidth="2" />
                <Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 12, paddingBottom: 8, gap: 2 },
  bubble: { maxWidth: '78%', borderRadius: radii.lg, padding: 12, marginBottom: 4, ...shadows.card },
  bubbleMine: { backgroundColor: colors.accent, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  bubbleTextOther: { color: colors.text },
  msgTime: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  msgTimeMine: { color: 'rgba(255,255,255,0.65)' },
  mediaBubble: { borderRadius: radii.md, overflow: 'hidden', position: 'relative', ...shadows.card },
  circleBubble: { borderRadius: 60, overflow: 'hidden', width: 120, height: 120 },
  imageThumb: { width: 200, height: 150 },
  onceBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  onceBadgeText: { color: '#fff', fontSize: 11 },
  viewedBubble: { backgroundColor: colors.surface2, borderRadius: radii.md, padding: 12, alignItems: 'center' },
  viewedText: { color: colors.textMuted, fontSize: 13 },
  voiceBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.lg, maxWidth: 240, ...shadows.card },
  voicePlay: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  waveBar: { width: 3, borderRadius: 2 },
  voiceTime: { fontSize: 11, color: colors.textMuted },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  typingBubble: { backgroundColor: colors.surface, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 8, ...shadows.card },
  typingDots: { color: colors.textMuted, letterSpacing: 4, fontSize: 10 },
  typingLabel: { color: colors.textMuted, fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 6, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  mediaBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  circleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: colors.surface2, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 9, color: colors.text, fontSize: 15, maxHeight: 110 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', ...shadows.btn },
  sendBtnRecording: { backgroundColor: colors.danger },
});
