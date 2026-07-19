import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { colors, radius, spacing, typography } from '@/theme';

export function AIManagerProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const menus = [
    { icon: '🎯', title: 'Task Model Mapping', sub: 'Chọn model cho từng tác vụ AI' },
    { icon: '📷', title: 'OCR Engine Settings', sub: 'PaddleOCR / EasyOCR / Mock' },
    { icon: '📝', title: 'Prompt Templates', sub: 'Quản lý system prompt' },
    { icon: '🔄', title: 'Fallback Settings', sub: 'Provider/engine dự phòng' },
    { icon: '🧪', title: 'Test Playground', sub: 'Test prompt + model' },
    { icon: '💰', title: 'Usage & Cost Limit', sub: 'Giới hạn request/token/chi phí' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.fullName}</Text>
            <Text style={styles.role}>AI MANAGER</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🛡️ Quyền hạn AI Manager</Text>
          <Text style={styles.infoText}>
            Bạn quản lý hạ tầng AI/OCR (provider, model, prompt, fallback, log).{"\n"}
            Không truy cập được dữ liệu khách hàng hoặc đơn hàng.
          </Text>
        </View>

        <View style={styles.menu}>
          {menus.map((m) => (
            <TouchableOpacity key={m.title} style={styles.menuItem}
              onPress={() => Alert.alert(m.title, 'Tính năng sẽ có ở MVP 5 (đang scaffold)')}>
              <Text style={styles.menuIcon}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuText}>{m.title}</Text>
                <Text style={styles.menuSub}>{m.sub}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 12, backgroundColor: colors.surface }}>
                  <ThemeToggle compact />
                </View>

                <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                  <Button title="Đăng xuất" onPress={handleLogout} variant="outline" fullWidth />
                </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12, backgroundColor: colors.surface },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.roleAiManager, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  role: { color: colors.roleAiManager, fontWeight: '600', fontSize: 11, marginTop: 2 },
  email: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  infoBox: { backgroundColor: '#FEF3C7', padding: 16, marginHorizontal: 20, marginTop: 20, borderRadius: 12 },
  infoTitle: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  infoText: { fontSize: 11, color: '#92400E', marginTop: 4, lineHeight: 18 },
  menu: { marginTop: 20, backgroundColor: colors.surface },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuIcon: { fontSize: 22, marginRight: 12 },
  menuText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  menuSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: 22, color: colors.textTertiary },
});
