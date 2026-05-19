import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/auth.store';
import { colors, radius, spacing, typography } from '@/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useNavigation } from '@react-navigation/native';

const DEMO_ACCOUNTS = [
  { label: 'Khách hàng', email: 'customer@minimart.vn' },
  { label: 'Nhân viên', email: 'staff@minimart.vn' },
  { label: 'Quản lý', email: 'admin@minimart.vn' },
  { label: 'AI Manager', email: 'ai@minimart.vn' },
];

export function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { login, loading } = useAuthStore();
  const [email, setEmail] = useState('customer@minimart.vn');
  const [password, setPassword] = useState('123456');

  const handleLogin = async () => {
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Đăng nhập thất bại',
        err.response?.data?.message ?? err.message ?? 'Vui lòng thử lại');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>🛒</Text>
            <Text style={styles.title}>Smart MiniMart AI</Text>
            <Text style={styles.subtitle}>Mua sắm thông minh, gọn gàng</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} style={styles.input}
              autoCapitalize="none" keyboardType="email-address"
              placeholder="email@example.com" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput value={password} onChangeText={setPassword} style={styles.input}
              secureTextEntry placeholder="••••••••" placeholderTextColor={colors.textTertiary} />

            <Button title="Đăng nhập" onPress={handleLogin} loading={loading} fullWidth
              style={{ marginTop: spacing.base }} />

            <TouchableOpacity onPress={() => nav.navigate('Register')} style={{ marginTop: spacing.lg, alignItems: 'center' }}>
              <Text style={styles.linkText}>Chưa có tài khoản? <Text style={{ color: colors.primary, fontWeight: '600' }}>Đăng ký</Text></Text>
            </TouchableOpacity>
          </View>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Tài khoản demo (mật khẩu: 123456)</Text>
            {DEMO_ACCOUNTS.map((a) => (
              <TouchableOpacity key={a.email} onPress={() => setEmail(a.email)}
                style={styles.demoItem}>
                <Text style={styles.demoLabel}>{a.label}</Text>
                <Text style={styles.demoEmail}>{a.email}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing['2xl'] },
  header: { alignItems: 'center', marginBottom: spacing['2xl'] },
  logo: { fontSize: 64, marginBottom: spacing.sm },
  title: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.text },
  subtitle: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing.xs },
  form: { gap: 6 },
  label: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing.md, fontWeight: typography.weight.medium },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.base,
    padding: spacing.md, fontSize: typography.size.base, color: colors.text,
    backgroundColor: colors.surface,
  },
  linkText: { color: colors.textSecondary, fontSize: typography.size.sm },
  demoBox: {
    marginTop: spacing.xl, padding: spacing.base, backgroundColor: colors.bgSecondary,
    borderRadius: radius.base,
  },
  demoTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.text, marginBottom: spacing.sm },
  demoItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  demoLabel: { fontSize: typography.size.sm, color: colors.text, fontWeight: typography.weight.medium },
  demoEmail: { fontSize: typography.size.xs, color: colors.textSecondary },
});
