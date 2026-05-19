import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/theme';

export function AdminProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const menus = [
    { icon: '🎁', title: 'Khuyến mãi & Voucher', sub: 'Quản lý mã giảm giá, flash sale' },
    { icon: '📊', title: 'Báo cáo doanh thu', sub: 'Theo ngày/tuần/tháng' },
    { icon: '🏷️', title: 'Danh mục sản phẩm', sub: 'Quản lý category cây' },
    { icon: '👥', title: 'Quản lý nhân viên', sub: 'Phân quyền staff' },
    { icon: '⚙️', title: 'Cài đặt cửa hàng', sub: 'Thông tin, giờ làm việc' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.fullName}</Text>
            <Text style={styles.role}>QUẢN LÝ CỬA HÀNG</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {menus.map((m) => (
            <TouchableOpacity key={m.title} style={styles.menuItem}
              onPress={() => Alert.alert(m.title, 'Tính năng sắp ra mắt (MVP nâng cao)')}>
              <Text style={styles.menuIcon}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuText}>{m.title}</Text>
                <Text style={styles.menuSub}>{m.sub}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <Button title="Đăng xuất" onPress={handleLogout} variant="outline" fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.roleAdmin, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  name: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text },
  role: { color: colors.roleAdmin, fontWeight: typography.weight.semibold, fontSize: typography.size.xs, marginTop: 2 },
  email: { color: colors.textSecondary, fontSize: typography.size.sm, marginTop: 2 },
  menu: { marginTop: spacing.lg, backgroundColor: colors.surface },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuIcon: { fontSize: 22, marginRight: spacing.md },
  menuText: { fontSize: typography.size.base, color: colors.text, fontWeight: typography.weight.semibold },
  menuSub: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: 22, color: colors.textTertiary },
});
