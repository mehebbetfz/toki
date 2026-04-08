import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, shadows } from '../theme';
import { getConversationId, getMessageHistory, ChatMsg } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useSignalR } from '../hooks/useSignalR';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

type MsgType = 'text' | 'image' | 'video' | 'circle_video';

interface LocalMsg extends ChatMsg {
  localType?: MsgType;
  localUri?: string;
  viewed?: boolean;
}

function encodeMsg(text: string): { ciphertextBase64: string; nonceBase64: string } {
  const nonce = new Uint8Array(24);
  crypto.getRandomValues(nonce);
  const buf = new TextEncoder().encode(text);
  const ct = buf.map((b, i) => b ^ nonce[i % 24]);
  return {
    ciphertextBase64: btoa(String.fromCharCode(...ct)),
    nonceBase64: btoa(String.fromCharCode(...nonce)),
  };
}

function decodeMsg(ciphertextBase64: string, nonceBase64?: string): string {
  try {
    if (!nonceBase64) return '[зашифровано]';
    const ct = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
    const nonce = Uint8Array.from(atob(nonceBase64), c => c.charCodeAt(0));
    const plain = ct.map((b, i) => b ^ nonce[i % 24]);
    return new TextDecoder().decode(plain);
  } catch { return '[ошибка]'; }
}

/** Bubble для одноразового просмотра медиа */
function OnceMediaBubble({ uri, type, isMine, onView }: {
  uri: string; type: MsgType; isMine: boolean; onView: () => void;
}) {
  const isCircle = type === 'circle_video';
  const isVideo = type === 'video' || isCircle;
  const size = isCircle ? 120 : undefined;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onView} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
      {isVideo ? (
        <View style={[s.mediaBubble, isCircle && { width: size, height: size, borderRadius: size! / 2, overflow: 'hidden' }]}>
          <Video
            source={{ uri }}
            style={isCircle ? { width: size, height: size } : s.videoThumb}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted
          />
          <View style={s.mediaOverlay}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
              <Path d="M5 3l14 9-14 9V3z" fill="#fff" />
            </Svg>
          </View>
          {isCircle && <View style={s.circleRing} />}
        </View>
      ) : (
        <View style={s.mediaBubble}>
          <Image source={{ uri }} style={s.imageThumb} />
          <View style={s.onceLabel}><Text style={s.onceLabelText}>👁 Один раз</Text></View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function ChatScreen({ route, navigation }: Props) {
  const { otherUserId, otherName } = route.params;
  const myId = useAuthStore(s => s.user?.id ?? '');
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const { connRef, connected } = useSignalR('chat');

  useEffect(() => { navigation.setOptions({ title: otherName }); }, [navigation, otherName]);

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
    conn.on('ReceiveCipher', (data: { messageId: string; senderUserId: string; ciphertextBase64: string; nonceBase64?: string; createdAtUtc: string }) => {
      setMessages(prev => [...prev, { id: data.messageId, senderUserId: data.senderUserId, ciphertextBase64: data.ciphertextBase64, nonceBase64: data.nonceBase64, createdAtUtc: data.createdAtUtc, viewed: false }]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => { conn.off('ReceiveCipher'); conn.invoke('LeaveConversation', convId).catch(() => {}); };
  }, [convId, connected, connRef]);

  const send = useCallback(async () => {
    if (!input.trim() || !convId || !connected || !connRef.current) return;
    const { ciphertextBase64, nonceBase64 } = encodeMsg(input.trim());
    setInput('');
    try { await connRef.current.invoke('SendCipher', convId, ciphertextBase64, nonceBase64); } catch (e) { console.warn(e); }
  }, [input, convId, connected, connRef]);

  const pickMedia = useCallback(async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа к медиатеке'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
      videoMaxDuration: 30,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const fakeMsg: LocalMsg = {
      id: `local_${Date.now()}`,
      senderUserId: myId,
      ciphertextBase64: `[${type === 'image' ? 'photo' : 'video'}]`,
      nonceBase64: undefined,
      createdAtUtc: new Date().toISOString(),
      localType: type,
      localUri: asset.uri,
      viewed: false,
    };
    setMessages(prev => [...prev, fakeMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [myId]);

  const recordCircleVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа к камере'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 15,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const fakeMsg: LocalMsg = {
      id: `circle_${Date.now()}`,
      senderUserId: myId,
      ciphertextBase64: '[circle_video]',
      nonceBase64: undefined,
      createdAtUtc: new Date().toISOString(),
      localType: 'circle_video',
      localUri: asset.uri,
      viewed: false,
    };
    setMessages(prev => [...prev, fakeMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [myId]);

  const handleViewOnce = useCallback((msgId: string) => {
    Alert.alert('Одноразовый просмотр', 'После просмотра медиа будет удалено.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Просмотреть', onPress: () => {
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, viewed: true } : m));
        }
      }
    ]);
  }, []);

  const renderItem = useCallback(({ item }: { item: LocalMsg }) => {
    const isMine = item.senderUserId === myId;
    const time = new Date(item.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Media message
    if (item.localUri && item.localType) {
      const viewed = item.viewed;
      return (
        <View style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', marginBottom: 8, maxWidth: '70%' }}>
          {viewed ? (
            <View style={s.viewedBubble}>
              <Text style={s.viewedText}>👁 Просмотрено</Text>
              <Text style={s.viewedTime}>{time}</Text>
            </View>
          ) : (
            <OnceMediaBubble uri={item.localUri} type={item.localType} isMine={isMine} onView={() => handleViewOnce(item.id)} />
          )}
        </View>
      );
    }

    const text = decodeMsg(item.ciphertextBase64, item.nonceBase64);
    return (
      <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
        <Text style={[s.bubbleText, !isMine && s.bubbleTextOther]}>{text}</Text>
        <Text style={[s.time, isMine && s.timeMine]}>{time}</Text>
      </View>
    );
  }, [myId, handleViewOnce]);

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
        <View style={s.topBar}>
          <View style={[s.dot, connected ? s.dotGreen : s.dotGray]} />
          <Text style={s.topBarText}>{connected ? 'В сети' : 'Подключение...'}</Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={s.inputRow}>
          {/* Attach media */}
          <TouchableOpacity style={s.mediaBtn} onPress={() => void pickMedia('image')}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={s.mediaBtn} onPress={() => void pickMedia('video')}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M23 7l-7 5 7 5V7z" stroke={colors.accent} strokeWidth="2" strokeLinejoin="round" />
              <Path d="M1 5h15a2 2 0 012 2v10a2 2 0 01-2 2H1" stroke={colors.accent} strokeWidth="2" />
            </Svg>
          </TouchableOpacity>
          {/* Circle video (round short) */}
          <TouchableOpacity style={s.circleBtn} onPress={() => void recordCircleVideo()}>
            <View style={s.circleBtnInner}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
                <Path d="M10 8l6 4-6 4V8z" fill="#fff" />
              </Svg>
            </View>
          </TouchableOpacity>

          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Сообщение..."
            placeholderTextColor={colors.textMuted}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => void send()}
          />
          <TouchableOpacity style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]} onPress={() => void send()} disabled={!input.trim() || !connected}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: colors.success },
  dotGray: { backgroundColor: colors.textMuted },
  topBarText: { color: colors.textMuted, fontSize: 13 },
  list: { padding: 16, gap: 2, paddingBottom: 8 },
  bubble: {
    maxWidth: '78%',
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 4,
    ...shadows.card,
  },
  bubbleMine: {
    backgroundColor: colors.accent,
    alignSelf: 'flex-end',
    borderBottomRightRadius: radii.sm,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: radii.sm,
  },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  bubbleTextOther: { color: colors.text },
  time: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.65)' },
  mediaBubble: {
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  imageThumb: { width: 200, height: 150, borderRadius: radii.md },
  videoThumb: { width: 200, height: 150 },
  mediaOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  circleRing: { ...StyleSheet.absoluteFillObject, borderRadius: 999, borderWidth: 3, borderColor: colors.accent },
  onceLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  onceLabelText: { color: '#fff', fontSize: 11 },
  viewedBubble: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    padding: 12,
    alignItems: 'center',
  },
  viewedText: { color: colors.textMuted, fontSize: 14 },
  viewedTime: { color: colors.textLight, fontSize: 10, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 6, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  mediaBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  circleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  circleBtnInner: { alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: colors.surface2, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 9, color: colors.text, fontSize: 15, maxHeight: 110 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', ...shadows.btn },
  sendBtnDisabled: { backgroundColor: colors.border },
});
