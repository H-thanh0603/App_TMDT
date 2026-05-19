import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/auth.store';
import { colors, radius, spacing, typography } from '@/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useNavigation } from '@react-navigation/native';

const DEMO_ACCOUNTS = [
  { label: 'Khách', email: 'customer@minimart.vn', emoji: '👤', color: '#10B981' },
  { label: 'Nhân viên', email: 'staff@minimart.vn', emoji: '👨‍💼', color: '#3B82F6' },
  { label: 'Quản lý', email: 'admin@minimart.vn', emoji: '👔', color: '#F59E0B' },
  { label: 'AI Manager', email: 'ai@minimart.vn', emoji: '🤖', color: '#8B5CF6' },
];

export function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { login, loading } = useAuthStore();
  const [email, setEmail] = useState('customer@minimart.vn');
  const [password, setPassword] = useState('123456');
  const [activeRole, setActiveRole] = useState(0);

  const handleLogin = async () => {
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Đăng nhập thất bại',
        err.response?.data?.message ?? err.message ?? 'Vui lòng thử lại');
    }
  };

  const pickDemo = (idx: number) => {
    setActiveRole(idx);
    setEmail(DEMO_ACCOUNTS[idx].email);
    setPassword('123456');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Brand header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🛒</Text>
              <View style={styles.sparkle}><Text style={styles.sparkleText}>✨</Text></View>
            </View>
            <Text style={styles.title}>Smart MiniMart AI</Text>
            <Text style={styles.subtitle}>Mua sắm thông minh - Trợ lý AI</Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Đăng nhập</Text>

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput value={email} onChangeText={setEmail} style={styles.input}
                autoCapitalize="none" keyboardType="email-address"
                placeholder="email@example.com" placeholderTextColor={colors.textMuted} />
            </View>

            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput value={password} onChangeText={setPassword} style={styles.input}
                secureTextEntry placeholder="••••••••" placeholderTextColor={colors.textMuted} />
            </View>

            <Button title="Đăng nhập" onPress={handleLogin} loading={loading} fullWidth
              style={{ marginTop: spacing.base }} />

            <TouchableOpacity onPress={() => nav.navigate('Register')} style={styles.linkBtn}>
              <Text style={styles.linkText}>Chưa có tài khoản? <Text style={styles.linkAccent}>Đăng ký</Text></Text>
            </TouchableOpacity>
          </View>

          {/* Demo accounts */}
          <View style={styles.demoSection}>
            <View style={styles.demoHeader}>
              <Text style={styles.demoTitle}>🎬 Tài khoản demo</Text>
              <Text style={styles.demoHint}>Mật khẩu: 123456</Text>
            </View>
            <View style={styles.demoRow}>
              {DEMO_ACCOUNTS.map((a, i) => (
                <TouchableOpacity
                  key={a.email}
                  style={[styles.demoCard, activeRole === i && { borderColor: a.color, borderWidth: 2 }]}
                  onPress={() => pickDemo(i)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.demoEmojiWrap, { backgroundColor: a.color + '20' }]}>
                    <Text style={styles.demoEmoji}>{a.emoji}</Text>
                  </View>
                  <Text style={styles.demoLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: spacing.base, justifyContent: 'center' },
  brandHeader: { alignItems: 'center', marginBottom: spacing.xl },
  logoCircle: {
    width: 96, height: 96, borderRadius: 28, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  logoEmoji: { fontSize: 48 },
  sparkle: {
    position: 'absolute', top: -4, right: -4,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.bg,
  },
  sparkleText: { fontSize: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: spacing.base },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },

  formCard: {
    backgroundColor: colors.card, borderRadius: 20, padding: spacing.lg,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  formTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  label: { fontSize: 13, color: colors.textSecondary, fontWeight: '600',
    marginBottom: 6, marginTop: spacing.sm },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgAlt, borderRadius: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, height: 48, color: colors.text, fontSize: 14 },
  linkBtn: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { fontSize: 14, color: colors.textMuted },
  linkAccent: { color: colors.primary, fontWeight: '700' },

  demoSection: { marginTop: spacing.xl },
  demoHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm, paddingHorizontal: 4,
  },
  demoTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  demoHint: { fontSize: 12, color: colors.textMuted },
  demoRow: { flexDirection: 'row', gap: 8 },
  demoCard: {
    flex: 1, alignItems: 'center', padding: 10,
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  demoEmojiWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  demoEmoji: { fontSize: 20 },
  demoLabel: { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' },
});
