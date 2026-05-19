import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExpiringProducts, useSlowMoving, useRestockSuggestions, useAllOrders } from '@/services/queries';
import { useAuthStore } from '@/store/auth.store';
import { colors, radius, spacing, typography } from '@/theme';
import { formatVnd } from '@/utils/format';

export function AdminDashboardScreen() {
  const { user } = useAuthStore();
  const { data: orders } = useAllOrders({ limit: 100 });
  const { data: expiring = [] } = useExpiringProducts(30);
  const { data: slow = [] } = useSlowMoving();
  const { data: restock = [] } = useRestockSuggestions();

  const orderItems = orders?.items ?? [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orderItems.filter((o: any) =>
    new Date(o.createdAt).getTime() >= today.getTime());
  const completedOrders = orderItems.filter((o: any) => o.status === 'COMPLETED');
  const todayRevenue = todayOrders
    .filter((o: any) => o.status !== 'CANCELED')
    .reduce((s: number, o: any) => s + Number(o.totalAmount), 0);
  const totalRevenue = completedOrders.reduce((s: number, o: any) => s + Number(o.totalAmount), 0);

  const critical = expiring.filter((p: any) => p.alertTier === 'CRITICAL').length;
  const urgentRestock = restock.filter((p: any) => p.urgency === 'HIGH').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Xin chào, {user?.fullName.split(' ').pop()}</Text>
          <Text style={styles.subtitle}>Tổng quan cửa hàng hôm nay</Text>
        </View>

        <View style={styles.kpiGrid}>
          <View style={[styles.kpi, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.kpiLabel}>Doanh thu hôm nay</Text>
            <Text style={[styles.kpiValue, { color: colors.primaryDark }]}>{formatVnd(todayRevenue)}</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: '#DBEAFE' }]}>
            <Text style={styles.kpiLabel}>Đơn hôm nay</Text>
            <Text style={[styles.kpiValue, { color: colors.info }]}>{todayOrders.length}</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: '#FCE7F3' }]}>
            <Text style={styles.kpiLabel}>Tổng doanh thu</Text>
            <Text style={[styles.kpiValue, { color: '#BE185D', fontSize: typography.size.lg }]}>
              {formatVnd(totalRevenue)}
            </Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: '#F3E8FF' }]}>
            <Text style={styles.kpiLabel}>Tổng đơn</Text>
            <Text style={[styles.kpiValue, { color: colors.roleAdmin }]}>{orderItems.length}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cảnh báo cần xử lý</Text>

        <View style={styles.alertCard}>
          <View style={styles.alertRow}>
            <Text style={styles.alertEmoji}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Hàng sắp hết hạn (≤7 ngày)</Text>
              <Text style={styles.alertDesc}>{critical} sản phẩm cần xử lý ngay</Text>
            </View>
            <Text style={[styles.alertBadge, { backgroundColor: colors.danger }]}>{critical}</Text>
          </View>

          <View style={styles.alertRow}>
            <Text style={styles.alertEmoji}>📉</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Hàng bán chậm (30 ngày)</Text>
              <Text style={styles.alertDesc}>Tồn kho cao, doanh số thấp</Text>
            </View>
            <Text style={[styles.alertBadge, { backgroundColor: colors.info }]}>{slow.length}</Text>
          </View>

          <View style={[styles.alertRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.alertEmoji}>📥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Cần nhập hàng gấp</Text>
              <Text style={styles.alertDesc}>{urgentRestock} sản phẩm sắp hết kho</Text>
            </View>
            <Text style={[styles.alertBadge, { backgroundColor: colors.warning }]}>{urgentRestock}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Hàng cận date — đề xuất giảm giá</Text>
        {expiring.slice(0, 5).map((p: any) => (
          <View key={p.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.itemMeta}>Còn {p.daysToExpire} ngày • Tồn: {p.stock}</Text>
            </View>
            <Text style={[styles.tierBadge, p.alertTier === 'CRITICAL' && { backgroundColor: colors.danger, color: '#fff' }]}>
              {p.alertTier}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  greeting: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  subtitle: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
  kpi: { width: '48%', padding: spacing.base, borderRadius: radius.base },
  kpiLabel: { fontSize: typography.size.xs, color: colors.textSecondary },
  kpiValue: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, marginTop: 4 },
  sectionTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.text, marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  alertCard: { backgroundColor: colors.surface, marginHorizontal: spacing.lg, borderRadius: radius.base },
  alertRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.divider },
  alertEmoji: { fontSize: 28, marginRight: spacing.md },
  alertTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.text },
  alertDesc: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  alertBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, color: '#fff', fontWeight: 'bold', fontSize: typography.size.xs, minWidth: 32, textAlign: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.base, marginHorizontal: spacing.lg, marginBottom: spacing.xs, borderRadius: radius.sm },
  itemName: { fontSize: typography.size.sm, color: colors.text, fontWeight: typography.weight.semibold },
  itemMeta: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  tierBadge: { fontSize: typography.size.xs, fontWeight: 'bold', backgroundColor: colors.bgSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, color: colors.text },
});
