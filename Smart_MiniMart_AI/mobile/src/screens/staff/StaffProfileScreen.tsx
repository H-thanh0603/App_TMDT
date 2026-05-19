import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/auth.store';
import { useExpiringProducts, useSlowMoving } from '@/services/queries';
import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/theme';

export function StaffProfileScreen() {
  const { user, logout } = useAuthStore();
  const { data: expiring = [] } = useExpiringProducts(30);
  const { data: slow = [] } = useSlowMoving();
  const nav = useNavigation<any>();

  const critical = expiring.filter((p: any) => p.alertTier === 'CRITICAL').length;
  const warning = expiring.filter((p: any) => p.alertTier === 'WARNING').length;

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.fullName}</Text>
            <Text style={styles.role}>NHÂN VIÊN</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cảnh báo cần chú ý</Text>
        <View style={styles.alertGrid}>
          <View style={[styles.alertCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.alertNumber, { color: colors.danger }]}>{critical}</Text>
            <Text style={styles.alertLabel}>Hết hạn trong 7 ngày</Text>
          </View>
          <View style={[styles.alertCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.alertNumber, { color: colors.warning }]}>{warning}</Text>
            <Text style={styles.alertLabel}>Hết hạn 8-15 ngày</Text>
          </View>
          <View style={[styles.alertCard, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.alertNumber, { color: colors.info }]}>{slow.length}</Text>
            <Text style={styles.alertLabel}>Hàng bán chậm</Text>
          </View>
        </View>

        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => nav.navigate('OCRScan')}>
            <Text style={styles.menuIcon}>📷</Text>
            <Text style={styles.menuText}>Quét phiếu nhập hàng</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
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
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.roleStaff, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  name: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text },
  role: { color: colors.roleStaff, fontWeight: typography.weight.semibold, fontSize: typography.size.xs, marginTop: 2 },
  email: { color: colors.textSecondary, fontSize: typography.size.sm, marginTop: 2 },
  sectionTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.text, marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  alertGrid: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  alertCard: { flex: 1, padding: spacing.base, borderRadius: radius.base, alignItems: 'center' },
  alertNumber: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold },
  alertLabel: { fontSize: typography.size.xs, color: colors.text, textAlign: 'center', marginTop: 4 },
  menu: { marginTop: spacing.lg, backgroundColor: colors.surface },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuIcon: { fontSize: 22, marginRight: spacing.md },
  menuText: { flex: 1, fontSize: typography.size.base, color: colors.text },
  menuArrow: { fontSize: 22, color: colors.textTertiary },
});
