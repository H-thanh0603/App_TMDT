import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text, View, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExpiringProducts, useSlowMoving, useRestockSuggestions } from '@/services/queries';
import { Badge } from '@/components/Badge';
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

  const isLoading = expiring.isLoading || slow.isLoading || restock.isLoading;

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
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : tab === 'expiring' ? (
        <FlatList
          data={expiring.data ?? []}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={{ padding: 20 }}
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
          ListEmptyComponent={<EmptyState text="Không có hàng cận date" />}
        />
      ) : tab === 'slow' ? (
        <FlatList
          data={slow.data ?? []}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={{ padding: 20 }}
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
          ListEmptyComponent={<EmptyState text="Không có hàng bán chậm" />}
        />
      ) : (
        <FlatList
          data={restock.data ?? []}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={{ padding: 20 }}
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
          ListEmptyComponent={<EmptyState text="Tồn kho ổn — chưa cần nhập" />}
        />
      )}
    </SafeAreaView>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 48 }}>📦</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  tier: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  tierText: { fontSize: 11, fontWeight: '800', color: colors.text },
  urgency: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  urgencyText: { fontSize: 11, fontWeight: '800', color: colors.text },
  priceTag: { fontWeight: '800', color: colors.primary, fontSize: 13, marginLeft: 8 },
  empty: { alignItems: 'center', paddingTop: 32 },
  emptyText: { color: colors.textSecondary, marginTop: 12 },
});
