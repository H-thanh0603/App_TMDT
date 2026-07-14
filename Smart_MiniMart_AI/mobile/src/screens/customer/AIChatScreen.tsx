import { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Keyboard,
  StyleSheet, Text, TextInput, TouchableOpacity, View, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAIChat } from '@/services/queries';
import { colors, radius, spacing, typography } from '@/theme';

interface Msg { id: string; role: 'user' | 'ai'; text: string }

export function AIChatScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: '0',
      role: 'ai',
      text: 'Xin chào! Tôi là trợ lý mua sắm AI. Bạn cần tư vấn gì hôm nay?',
    },
  ]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList>(null);
  const chat = useAIChat();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const s2 = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Msg = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await chat.mutateAsync(userMsg.text);
      const aiMsg: Msg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: typeof res.message === 'string' ? res.message : JSON.stringify(res.message),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'ai',
          text: 'Xin lỗi, hệ thống đang bận. Bạn thử lại sau nhé.',
        },
      ]);
    }
  };

  // Android: lift input bar by keyboard height; iOS: KeyboardAvoidingView padding
  const androidPad = Platform.OS === 'android' ? Math.max(0, keyboardHeight - insets.bottom) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Trợ lý mua sắm 🤖</Text>
        <Text style={styles.subtitle}>Gợi ý sản phẩm, combo, khuyến mãi</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{
              padding: spacing.lg,
              paddingBottom: spacing.lg + (Platform.OS === 'android' ? 8 : 0),
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <View style={[styles.bubbleWrap, item.role === 'user' && { alignItems: 'flex-end' }]}>
                <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                  <Text style={[styles.bubbleText, item.role === 'user' && { color: '#fff' }]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            )}
            ListFooterComponent={
              chat.isPending ? (
                <View style={styles.bubbleWrap}>
                  <View style={[styles.bubble, styles.bubbleAI]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                </View>
              ) : null
            }
          />
        </TouchableWithoutFeedback>

        <View style={[styles.inputBar, { marginBottom: androidPad, paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            style={styles.input}
            placeholder="Hỏi gì cũng được..."
            placeholderTextColor={colors.textTertiary}
            multiline
            onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200)}
          />
          <TouchableOpacity
            onPress={send}
            style={[styles.sendBtn, (chat.isPending || !input.trim()) && { opacity: 0.5 }]}
            disabled={chat.isPending || !input.trim()}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.text },
  subtitle: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  bubbleWrap: { marginVertical: spacing.xs },
  bubble: { maxWidth: '80%', padding: spacing.md, borderRadius: radius.base },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleAI: {
    backgroundColor: colors.surface, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  bubbleText: { fontSize: typography.size.sm, color: colors.text, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.sm, paddingTop: spacing.sm,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8,
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.base,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    maxHeight: 100, color: colors.text, fontSize: typography.size.sm,
    backgroundColor: colors.bgSecondary,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
