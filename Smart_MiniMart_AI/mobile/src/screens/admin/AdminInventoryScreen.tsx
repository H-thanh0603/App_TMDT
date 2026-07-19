import React, { useState } from 'react';
import {
  FlatList, StyleSheet, Text, View, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExpiringProducts, useSlowMoving, useRestockSuggestions } from '@/services/queries';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { colors } from '@/theme/colors';
import { formatVnd } from '@/utils/format';

type Tab = 'expiring' | 'slow' | 'restock';

const TABS: Array<{ key: Tab; label: string; emoji: string }> = [
  { key: 'expiring', label: 'Cận date', emoji: '⏰' },
  { key: 'slow', label: 'Bán chậm', emoji: '📉' },
  { key: 'restock', label: 'Cần nhập', emoji: '📥' },
];

export function AdminInventoryScreen() {
  const [tab, setTab] = useState<Tab>('expiring');
  const expiring = useExpiringProducts(30);
  const slow = useSlowMoving();
  const restock = useRestockSuggestions();

  const activeQ = tab === 'expiring' ? expiring : tab === 'slow' ? slow : restock;
  const isLoading = activeQ.isLoading && !activeQ.data;
  const isError = activeQ.isError && !activeQ.data;

  const retry = () => {
    expiring.refetch();
    slow.refetch();
    restock.refetch();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý kho</Text>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={styles.tabEmoji}>{t.emoji}</Text>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ListRowSkeleton count={5} />
      ) : isError ? (
        <ErrorState
          title="Không tải được dữ liệu kho"
          description="Kiểm tra mạng rồi thử lại."
          onRetry={retry}
        />
      ) : tab === 'expiring' ? (
        <FlatList
          data={expiring.data ?? []}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          onRefresh={retry}
          refreshing={expiring.isFetching && !expiring.isLoading}
          renderItem={({ item }: any) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  Tồn: {item.stock} • Còn {item.daysToExpire} ngày
                </Text>
              </View>
              <Badge
                label={item.alertTier}
                variant={item.alertTier === 'CRITICAL' ? 'danger' : item.alertTier === 'WARNING' ? 'warning' : 'info'}
                size="sm"
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="✅"
              title="Không có hàng cận date"
              description="Không có sản phẩm sắp hết hạn trong 30 ngày."
              actionLabel="Tải lại"
              onAction={retry}
              actionVariant="outline"
            />
          }
        />
      ) : tab === 'slow' ? (
        <FlatList
          data={slow.data ?? []}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          onRefresh={retry}
          refreshing={slow.isFetching && !slow.isLoading}
          renderItem={({ item }: any) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  Tồn: {item.stock} • Bán 30 ngày: {item.soldInPeriod}
                </Text>
                <Text style={styles.itemMeta}>
                  Tỷ lệ xoay vòng: {(item.turnoverRate * 100).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.priceTag}>{formatVnd(Number(item.price))}</Text>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="📈"
              title="Không có hàng bán chậm"
              description="Tất cả sản phẩm đang xoay vòng ổn."
              actionLabel="Tải lại"
              onAction={retry}
              actionVariant="outline"
            />
          }
        />
      ) : (
        <FlatList
          data={restock.data ?? []}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          onRefresh={retry}
          refreshing={restock.isFetching && !restock.isLoading}
          renderItem={({ item }: any) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  Còn {item.currentStock}/{item.maxStock} • Bán/ngày: {item.dailyRate}
                </Text>
                <Text style={styles.suggestion}>
                  💡 Đề xuất nhập: {item.suggestedRestock} đơn vị
                </Text>
              </View>
              <Badge
                label={item.urgency}
                variant={item.urgency === 'HIGH' ? 'danger' : item.urgency === 'MEDIUM' ? 'warning' : 'success'}
                size="sm"
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="📦"
              title="Tồn kho ổn"
              description="Chưa cần nhập thêm hàng."
              actionLabel="Tải lại"
              onAction={retry}
              actionVariant="outline"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
  tab: { flex: 1, alignItems: 'center', padding: 8, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.roleAdmin, borderColor: colors.roleAdmin },
  tabEmoji: { fontSize: 18 },
  tabText: { fontSize: 11, color: colors.text, marginTop: 2 },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  itemMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  suggestion: { fontSize: 11, color: colors.primary, marginTop: 4, fontWeight: '600' },
  priceTag: { fontWeight: '800', color: colors.primary, fontSize: 13, marginLeft: 8 },
});
