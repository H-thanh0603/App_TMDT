import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/theme';

export function ProfileScreen() {
  const nav = useNavigation<any>();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const menuItems = [
    { icon: '📦', title: 'Đơn hàng của tôi', screen: 'Orders' },
    { icon: '📍', title: 'Địa chỉ giao hàng', screen: null },
    { icon: '⭐', title: 'Sản phẩm yêu thích', screen: null },
    { icon: '🎁', title: 'Mã giảm giá', screen: null },
    { icon: '🔔', title: 'Thông báo', screen: null },
    { icon: 'ℹ️', title: 'Về Smart MiniMart AI', screen: null },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.fullName.charAt(0).toUpperCase() ?? '👤'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user?.fullName}</Text>
              {user?.isVip && <View style={styles.vipBadge}><Text style={styles.vipText}>VIP</Text></View>}
            </View>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.loyaltyPoints ?? 0}</Text>
            <Text style={styles.statLabel}>Điểm tích lũy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Voucher</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Đã mua</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {menuItems.map((m) => (
            <TouchableOpacity key={m.title} style={styles.menuItem}
              onPress={() => m.screen ? nav.navigate(m.screen) : Alert.alert(m.title, 'Tính năng sắp ra mắt')}>
              <Text style={styles.menuIcon}>{m.icon}</Text>
              <Text style={styles.menuText}>{m.title}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <Button title="Đăng xuất" onPress={handleLogout} variant="outline" fullWidth />
        </View>

        <Text style={styles.version}>Smart MiniMart AI v0.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text },
  vipBadge: { backgroundColor: colors.secondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  vipText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  email: { color: colors.textSecondary, marginTop: 2, fontSize: typography.size.sm },
  statsRow: { flexDirection: 'row', backgroundColor: colors.surface, marginTop: spacing.sm, padding: spacing.lg },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.primary },
  statLabel: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: colors.border },
  menu: { marginTop: spacing.sm, backgroundColor: colors.surface },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuIcon: { fontSize: 22, marginRight: spacing.md },
  menuText: { flex: 1, fontSize: typography.size.base, color: colors.text },
  menuArrow: { fontSize: 22, color: colors.textTertiary },
  version: { textAlign: 'center', color: colors.textTertiary, marginTop: spacing.lg, fontSize: typography.size.xs },
});
