import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMyOrders } from '@/services/queries';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDateTime, formatVnd, statusLabel } from '@/utils/format';
import type { OrderStatus } from '@/types';

const statusColor: Record<OrderStatus, string> = {
  PENDING: colors.warning,
  CONFIRMED: colors.info,
  PREPARING: colors.info,
  DELIVERING: colors.accent,
  COMPLETED: colors.success,
  CANCELED: colors.danger,
};

export function OrdersScreen() {
  const { data, isLoading } = useMyOrders();
  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <Text style={[styles.status, { color: statusColor[item.status] }]}>
                {statusLabel(item.status)}
              </Text>
            </View>
            <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
            <View style={styles.itemList}>
              {item.items.slice(0, 2).map((it) => (
                <Text key={it.id} style={styles.itemLine} numberOfLines={1}>
                  • {it.productName} × {it.quantity}
                </Text>
              ))}
              {item.items.length > 2 && (
                <Text style={styles.itemLine}>và {item.items.length - 2} sản phẩm khác...</Text>
              )}
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.payment}>
                {item.paymentMethod === 'COD' ? 'Tiền mặt' : item.paymentMethod}
              </Text>
              <Text style={styles.total}>{formatVnd(Number(item.totalAmount))}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>📦</Text>
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.base,
    padding: spacing.base, marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text },
  status: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  date: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 4 },
  itemList: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  itemLine: { fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: 2 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  payment: { color: colors.textSecondary, fontSize: typography.size.sm },
  total: { fontWeight: typography.weight.bold, color: colors.primary, fontSize: typography.size.base },
  empty: { alignItems: 'center', paddingTop: spacing['2xl'] },
  emptyText: { color: colors.textSecondary, marginTop: spacing.md },
});
