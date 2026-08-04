import React, { useState } from 'react';
import {
  FlatList, StyleSheet, Text, View, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAllOrders, useOrderSummary, useUpdateOrderStatus } from '@/services/queries';
import { VietQrConfirmationModal } from '@/components/VietQrConfirmationModal';
import { useAuthStore } from '@/store/auth.store';
import { Badge } from '@/components/Badge';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { colors } from '@/theme/colors';
import { formatDateTime, formatVnd, statusLabel } from '@/utils/format';
import type { OrderStatus } from '@/types';

const FILTERS: Array<{ label: string; value?: OrderStatus; emoji: string }> = [
  { label: 'Tất cả', emoji: '📋' },
  { label: 'Chờ', value: 'PENDING', emoji: '⏳' },
  { label: 'Xác nhận', value: 'CONFIRMED', emoji: '✓' },
  { label: 'Chuẩn bị', value: 'PREPARING', emoji: '📦' },
  { label: 'Đang giao', value: 'DELIVERING', emoji: '🚚' },
];

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  PENDING: 'CONFIRMED', CONFIRMED: 'PREPARING', PREPARING: 'DELIVERING',
  DELIVERING: 'COMPLETED', COMPLETED: null, CANCELED: null,
};

const STATUS_VARIANT: Record<string, any> = {
  PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'ai',
  DELIVERING: 'gold', COMPLETED: 'success', CANCELED: 'danger',
};

const NEXT_LABEL: Record<string, string> = {
  CONFIRMED: 'Xác nhận', PREPARING: 'Chuẩn bị',
  DELIVERING: 'Giao hàng', COMPLETED: 'Hoàn tất',
};

export function StaffOrdersScreen() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<OrderStatus | undefined>('PENDING');
  const { data, isLoading, isError, refetch, isFetching } = useAllOrders(filter ? { status: filter, limit: 100 } : { limit: 100 });
  const update = useUpdateOrderStatus();
  const [confirming, setConfirming] = useState<any>(null);
  const items = data?.items ?? [];

  const { data: summary } = useOrderSummary();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { data: todaySummary } = useOrderSummary({ from: today.toISOString() });
  const stats = {
    pending: summary?.pendingOrders ?? 0,
    processing: Math.max(0, Number(summary?.totalOrders ?? 0) - Number(summary?.pendingOrders ?? 0) - Number(summary?.completedOrders ?? 0)),
    todayCount: todaySummary?.periodOrders ?? 0,
  };

  const advance = (orderId: string, currentStatus: OrderStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    Alert.alert(
      'Cập nhật trạng thái',
      `Chuyển sang "${NEXT_LABEL[next] || next}"?`,
      [
        { text: 'Hủy' },
        {
          text: 'OK',
          onPress: async () => {
            try {
              await update.mutateAsync({ id: orderId, status: next });
            } catch (e: any) {
              Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể cập nhật');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Xin chào,</Text>
          <Text style={styles.userName}>{user?.fullName?.split(' ').pop() ?? 'Nhân viên'}</Text>
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.statsRow}>
        <StatCard
          label="Chờ xử lý"
          value={stats.pending}
          icon="⏳"
          variant="primary"
          style={{ marginRight: 4 }}
        />
        <StatCard
          label="Đang xử lý"
          value={stats.processing}
          icon="📦"
          variant="info"
          style={{ marginHorizontal: 4 }}
        />
        <StatCard
          label="Hôm nay"
          value={stats.todayCount}
          icon="📅"
          variant="ai"
          style={{ marginLeft: 4 }}
        />
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={FILTERS} keyExtractor={(f) => f.label}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        style={{ maxHeight: 50 }}
        renderItem={({ item }) => {
          const active = filter === item.value;
          return (
            <Pressable
              onPress={() => setFilter(item.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipEmoji, active && { color: 'white' }]}>{item.emoji}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        }}
      />

      {isLoading && !data ? (
              <ListRowSkeleton count={5} />
            ) : isError && !data ? (
              <ErrorState title="Không tải được đơn hàng" onRetry={() => refetch()} />
            ) : (
              <FlatList
                data={items}
                keyExtractor={(o: any) => o.id}
                contentContainerStyle={{ padding: 12, flexGrow: 1 }}
                onRefresh={refetch}
                refreshing={isFetching && !isLoading}
                renderItem={({ item: rawItem }) => {
                  const item = rawItem as any;
                  const next = NEXT_STATUS[item.status as OrderStatus];
                  const itemCount = item.items?.length ?? 0;
                  return (
                    <View style={styles.orderCard}>
                      <View style={styles.orderHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                          <Text style={styles.orderTime}>{formatDateTime(item.createdAt)}</Text>
                        </View>
                        <Badge
                          label={statusLabel(item.status)}
                          variant={STATUS_VARIANT[item.status] || 'neutral'}
                          size="md"
                        />
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.customerRow}>
                        <View style={styles.customerIcon}>
                          <Text style={{ fontSize: 16 }}>👤</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.customerName}>
                            {item.customer?.fullName ?? item.shippingName ?? 'Khách'}
                          </Text>
                          <Text style={styles.customerPhone}>
                            {item.customer?.phone ?? item.shippingPhone ?? ''}
                          </Text>
                        </View>
                      </View>

                      {item.shippingAddress && (
                        <Text style={styles.address} numberOfLines={2}>
                          📍 {item.shippingAddress}
                        </Text>
                      )}

                      <View style={styles.summaryRow}>
                        <Text style={styles.itemCount}>{itemCount} sản phẩm</Text>
                        <Text style={styles.total}>{formatVnd(Number(item.totalAmount))}</Text>
                      </View>

                      {item.paymentMethod === 'BANK' && item.paymentStatus !== 'PAID' && item.status === 'PENDING' && (
                        <Pressable style={styles.actionBtn} onPress={() => setConfirming(item)}>
                          <Text style={styles.actionText}>Xác nhận VietQR</Text>
                        </Pressable>
                      )}

                      {next && (
                        <Pressable
                          style={styles.actionBtn}
                          onPress={() => advance(item.id, item.status)}
                        >
                          <Text style={styles.actionText}>
                            → {NEXT_LABEL[next] || next}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <EmptyState
                    icon="📭"
                    title="Không có đơn nào"
                    description={filter ? 'Thử đổi bộ lọc trạng thái.' : 'Chưa có đơn cần xử lý.'}
                    actionLabel={filter ? 'Xem tất cả' : 'Tải lại'}
                    onAction={() => {
                      if (filter) setFilter(undefined);
                      else refetch();
                    }}
                  />
                }
              />
            )}
      <VietQrConfirmationModal order={confirming} onClose={() => setConfirming(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.roleStaff,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  userName: { color: 'white', fontSize: 22, fontWeight: '800', marginTop: 2 },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 12, marginTop: -16, marginBottom: 8,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 18, backgroundColor: colors.bgAlt, height: 36,
  },
  chipActive: { backgroundColor: colors.primary },
  chipEmoji: { fontSize: 14 },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: 'white' },
  orderCard: {
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    marginBottom: 10,
    shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  orderNumber: { fontSize: 15, fontWeight: '800', color: colors.text },
  orderTime: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 10 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customerIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.aiSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  customerName: { fontSize: 14, fontWeight: '700', color: colors.text },
  customerPhone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  address: {
    fontSize: 12, color: colors.textSecondary,
    marginTop: 8, lineHeight: 16,
    backgroundColor: colors.bgAlt, padding: 8, borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10,
  },
  itemCount: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  total: { fontSize: 17, fontWeight: '800', color: colors.primary },
  actionBtn: {
    backgroundColor: colors.primary, marginTop: 12,
    padding: 12, borderRadius: 10, alignItems: 'center',
  },
  actionText: { color: 'white', fontWeight: '800', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
});
