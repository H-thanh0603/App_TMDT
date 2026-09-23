import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { api, unwrap } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useNavigation } from '@react-navigation/native';

/** Q23: quên mật khẩu — xin link reset (server luôn trả OK để không lộ email). */
export function ForgotPasswordScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const request = async () => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
      Alert.alert('Đã gửi', 'Nếu email tồn tại, hướng dẫn đặt lại đã được gửi.');
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Thử lại sau');
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token: token.trim(), newPassword: password });
      Alert.alert('Thành công', unwrap<any>(res)?.message ?? 'Đã đặt lại mật khẩu', [
        { text: 'Đăng nhập', onPress: () => nav.navigate('Login') },
      ]);
    } catch (err: any) {
      const m = err.response?.data?.message;
      Alert.alert('Thất bại', Array.isArray(m) ? m.join('\n') : (m ?? 'Link hết hạn'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Quên mật khẩu</Text>
          {!sent ? (
            <View style={styles.card}>
              <Text style={styles.label}>Email đăng ký</Text>
              <TextInput value={email} onChangeText={setEmail} style={styles.input}
                autoCapitalize="none" keyboardType="email-address" placeholder="email@example.com" />
              <Button title="Gửi link đặt lại" onPress={request} loading={loading} fullWidth
                style={{ marginTop: spacing.base }} />
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.label}>Mã/token trong email</Text>
              <TextInput value={token} onChangeText={setToken} style={styles.input}
                autoCapitalize="none" placeholder="token 64 ký tự" />
              <Text style={styles.label}>Mật khẩu mới (≥8 ký tự, có chữ + số)</Text>
              <TextInput value={password} onChangeText={setPassword} style={styles.input}
                secureTextEntry placeholder="••••••••" />
              <Button title="Đặt lại mật khẩu" onPress={reset} loading={loading} fullWidth
                style={{ marginTop: spacing.base }} />
            </View>
          )}
          <TouchableOpacity onPress={() => nav.navigate('Login')} style={styles.linkBtn}>
            <Text style={styles.link}>← Về đăng nhập</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg },
  title: { fontSize: typography.size.xl, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg },
  label: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: spacing.sm, marginBottom: 6 },
  input: { backgroundColor: colors.bgAlt, borderRadius: 12, paddingHorizontal: 12, height: 48, color: colors.text, borderWidth: 1, borderColor: colors.border },
  linkBtn: { marginTop: spacing.lg, alignItems: 'center' },
  link: { color: colors.primary, fontWeight: '700' },
});
