import React, { useState, useMemo } from 'react';
import {
  FlatList, StyleSheet, Text, View, Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMyOrders } from '@/services/queries';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { colors } from '@/theme/colors';
import { formatDateTime, formatVnd, statusLabel } from '@/utils/format';
import type { OrderStatus } from '@/types';

const STATUS_VARIANT: Record<string, any> = {
  PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'ai',
  DELIVERING: 'gold', COMPLETED: 'success', CANCELED: 'danger',
};

const FILTERS: Array<{ label: string; value?: OrderStatus; emoji: string }> = [
  { label: 'Tất cả', emoji: '📋' },
  { label: 'Chờ', value: 'PENDING', emoji: '⏳' },
  { label: 'Đang xử lý', value: 'PREPARING', emoji: '📦' },
  { label: 'Đang giao', value: 'DELIVERING', emoji: '🚚' },
  { label: 'Hoàn tất', value: 'COMPLETED', emoji: '✅' },
];

export function OrdersScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const initialFilter = route.params?.filter as OrderStatus | undefined;
  const [filter, setFilter] = useState<OrderStatus | undefined>(initialFilter);

  const { data, isLoading, isError, refetch, isFetching } = useMyOrders();
  const allItems = data?.items ?? [];

  const items = useMemo(() => {
    if (!filter) return allItems;
    return allItems.filter((o: any) => o.status === filter);
  }, [allItems, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    allItems.forEach((o: any) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [allItems]);

  if (isLoading && !data) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ListRowSkeleton count={5} />
      </SafeAreaView>
    );
  }

  if (isError && !data) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['bottom']}>
        <ErrorState
          title="Không tải được đơn hàng"
          description="Kiểm tra mạng rồi thử lại."
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const cnt = f.value ? (counts[f.value] || 0) : allItems.length;
          return (
            <Pressable
              key={f.label}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={styles.chipEmoji}>{f.emoji}</Text>
              <Text style={[styles.chipText, active && { color: 'white' }]}>{f.label}</Text>
              {cnt > 0 && (
                <View style={[styles.chipCount, active && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                  <Text style={[styles.chipCountText, active && { color: 'white' }]}>{cnt}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(o: any) => o.id}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        onRefresh={refetch}
        refreshing={isFetching && !isLoading}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => nav.navigate('OrderDetail', { id: item.id })}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
              </View>
              <Badge
                label={statusLabel(item.status)}
                variant={STATUS_VARIANT[item.status] || 'default'}
                size="md"
              />
            </View>

            <View style={styles.itemList}>
              {item.items.slice(0, 2).map((it: any) => (
                <Text key={it.id} style={styles.itemLine} numberOfLines={1}>
                  • {it.productName} × {it.quantity}
                </Text>
              ))}
              {item.items.length > 2 && (
                <Text style={styles.itemMore}>và {item.items.length - 2} sản phẩm khác...</Text>
              )}
            </View>

            <View style={styles.cardFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.payment}>
                  {item.paymentMethod === 'COD' ? '💵 Tiền mặt' : '🏦 ' + item.paymentMethod}
                </Text>
                <Text style={styles.itemCount}>{item.items.length} sản phẩm</Text>
              </View>
              <Text style={styles.total}>{formatVnd(Number(item.totalAmount))}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📦"
            title={filter ? `Không có đơn ${statusLabel(filter).toLowerCase()}` : 'Chưa có đơn hàng'}
            description={
              filter
                ? 'Đổi bộ lọc để xem đơn khác.'
                : 'Hãy mua sắm để có đơn hàng đầu tiên.'
            }
            actionLabel={filter ? 'Xem tất cả' : 'Mua sắm ngay'}
            onAction={() => {
              if (filter) setFilter(undefined);
              else nav.navigate('ProductList');
            }}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterScroll: { backgroundColor: 'white', maxHeight: 56 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
    backgroundColor: colors.bgAlt, height: 36,
  },
  chipActive: { backgroundColor: colors.primary },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  chipCount: {
    minWidth: 20, paddingHorizontal: 6, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  chipCountText: { fontSize: 10, fontWeight: '800', color: colors.text },
  card: {
    backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderNumber: { fontSize: 15, fontWeight: '800', color: colors.text },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  itemList: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  itemLine: { fontSize: 13, color: colors.textSecondary, marginBottom: 3 },
  itemMore: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  payment: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  itemCount: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  total: { fontWeight: '900', color: colors.primary, fontSize: 17 },
});
