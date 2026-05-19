import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/auth.store';
import { colors, radius, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';

export function RegisterScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
  });

  const handleRegister = async () => {
    if (form.password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    try {
      await register(form.email.trim(), form.password, form.fullName.trim(), form.phone.trim() || undefined);
    } catch (err: any) {
      Alert.alert('Đăng ký thất bại',
        err.response?.data?.message ?? err.message);
    }
  };

  const fields: Array<{ key: keyof typeof form; label: string; placeholder: string; keyboard?: any; secure?: boolean }> = [
    { key: 'fullName', label: 'Họ và tên', placeholder: 'Nguyễn Văn A' },
    { key: 'email', label: 'Email', placeholder: 'email@example.com', keyboard: 'email-address' },
    { key: 'phone', label: 'Số điện thoại (tùy chọn)', placeholder: '0901234567', keyboard: 'phone-pad' },
    { key: 'password', label: 'Mật khẩu', placeholder: '••••••••', secure: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Mua sắm tiện hơn với tài khoản Smart MiniMart</Text>

          <View style={{ marginTop: spacing.lg }}>
            {fields.map((f) => (
              <View key={f.key}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  value={form[f.key]}
                  onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                  style={styles.input}
                  autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
                  keyboardType={f.keyboard ?? 'default'}
                  secureTextEntry={f.secure}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            ))}
          </View>

          <Button title="Đăng ký" onPress={handleRegister} loading={loading} fullWidth
            style={{ marginTop: spacing.lg }} />

          <TouchableOpacity onPress={() => nav.goBack()}
            style={{ marginTop: spacing.lg, alignItems: 'center' }}>
            <Text style={styles.linkText}>
              Đã có tài khoản? <Text style={{ color: colors.primary, fontWeight: '600' }}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing['2xl'] },
  title: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.text },
  subtitle: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing.xs },
  label: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing.md, fontWeight: typography.weight.medium },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.base,
    padding: spacing.md, fontSize: typography.size.base, color: colors.text,
    backgroundColor: colors.surface,
  },
  linkText: { color: colors.textSecondary, fontSize: typography.size.sm },
});
