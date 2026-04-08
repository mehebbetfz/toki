import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii } from '../theme';
import { getConversationId, getMessageHistory, ChatMsg } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useSignalR } from '../hooks/useSignalR';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

/** Very basic XOR obfuscation for demo (replace with libsodium/NaCl for real E2E). */
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
    const ct = Uint8Array.from(atob(ciphertextBase64), (c) => c.charCodeAt(0));
    const nonce = Uint8Array.from(atob(nonceBase64), (c) => c.charCodeAt(0));
    const plain = ct.map((b, i) => b ^ nonce[i % 24]);
    return new TextDecoder().decode(plain);
  } catch {
    return '[ошибка декодирования]';
  }
}

export function ChatScreen({ route, navigation }: Props) {
  const { otherUserId, otherName } = route.params;
  const myId = useAuthStore((s) => s.user?.id ?? '');
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const { connRef, connected } = useSignalR('chat');

  useEffect(() => {
    navigation.setOptions({ title: otherName });
  }, [navigation, otherName]);

  useEffect(() => {
    (async () => {
      const id = await getConversationId(otherUserId);
      setConvId(id);
      const hist = await getMessageHistory(id);
      setMessages(hist);
    })();
  }, [otherUserId]);

  useEffect(() => {
    if (!convId || !connected || !connRef.current) return;
    const conn = connRef.current;
    conn.invoke('JoinConversation', convId).catch(console.warn);

    conn.on('ReceiveCipher', (data: { messageId: string; senderUserId: string; ciphertextBase64: string; nonceBase64?: string; createdAtUtc: string }) => {
      const msg: ChatMsg = {
        id: data.messageId,
        senderUserId: data.senderUserId,
        ciphertextBase64: data.ciphertextBase64,
        nonceBase64: data.nonceBase64,
        createdAtUtc: data.createdAtUtc,
      };
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });

    return () => {
      conn.off('ReceiveCipher');
      conn.invoke('LeaveConversation', convId).catch(() => {});
    };
  }, [convId, connected, connRef]);

  const send = useCallback(async () => {
    if (!input.trim() || !convId || !connected || !connRef.current) return;
    const { ciphertextBase64, nonceBase64 } = encodeMsg(input.trim());
    setInput('');
    try {
      await connRef.current.invoke('SendCipher', convId, ciphertextBase64, nonceBase64);
    } catch (e) {
      console.warn('[Chat] send error', e);
    }
  }, [input, convId, connected, connRef]);

  const renderItem = useCallback(({ item }: { item: ChatMsg }) => {
    const isMine = item.senderUserId === myId;
    const text = decodeMsg(item.ciphertextBase64, item.nonceBase64);
    const time = new Date(item.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
        <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>{text}</Text>
        <Text style={s.time}>{time}</Text>
      </View>
    );
  }, [myId]);

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <View style={s.topBar}>
          <View style={[s.dot, connected ? s.dotGreen : s.dotGray]} />
          <Text style={s.topBarText}>{connected ? 'Подключено' : 'Подключение...'}</Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={s.inputRow}>
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
          <TouchableOpacity
            style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]}
            onPress={() => void send()}
            disabled={!input.trim() || !connected}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke={colors.text} strokeWidth="2" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: colors.accent },
  dotGray: { backgroundColor: colors.textMuted },
  topBarText: { color: colors.textMuted, fontSize: 13 },
  list: { padding: 16, gap: 8 },
  bubble: {
    maxWidth: '78%',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 4,
  },
  bubbleMine: { backgroundColor: colors.accent, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: colors.text },
  time: { color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
});
