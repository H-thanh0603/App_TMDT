import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text,
  TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExpiringProducts, useSlowMoving, useRestockSuggestions } from '@/services/queries';
import { colors, radius, spacing, typography } from '@/theme';
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
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={styles.tabEmoji}>{t.emoji}</Text>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : tab === 'expiring' ? (
        <FlatList
          data={expiring.data ?? []}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }: any) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  Tồn: {item.stock} • Còn {item.daysToExpire} ngày
                </Text>
              </View>
              <View style={[styles.tier, tierStyle(item.alertTier)]}>
                <Text style={styles.tierText}>{item.alertTier}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyState text="Không có hàng cận date" />}
        />
      ) : tab === 'slow' ? (
        <FlatList
          data={slow.data ?? []}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={{ padding: spacing.lg }}
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
          contentContainerStyle={{ padding: spacing.lg }}
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
              <View style={[styles.urgency, urgencyStyle(item.urgency)]}>
                <Text style={styles.urgencyText}>{item.urgency}</Text>
              </View>
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

function tierStyle(tier: string) {
  if (tier === 'CRITICAL') return { backgroundColor: '#FEE2E2' };
  if (tier === 'WARNING') return { backgroundColor: '#FEF3C7' };
  return { backgroundColor: '#DBEAFE' };
}
function urgencyStyle(u: string) {
  if (u === 'HIGH') return { backgroundColor: '#FEE2E2' };
  if (u === 'MEDIUM') return { backgroundColor: '#FEF3C7' };
  return { backgroundColor: '#D1FAE5' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: 8 },
  tab: { flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: radius.base, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.roleAdmin, borderColor: colors.roleAdmin },
  tabEmoji: { fontSize: 18 },
  tabText: { fontSize: typography.size.xs, color: colors.text, marginTop: 2 },
  tabTextActive: { color: '#fff', fontWeight: typography.weight.semibold },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.base, borderRadius: radius.base, marginBottom: spacing.sm },
  itemName: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.text },
  itemMeta: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  suggestion: { fontSize: typography.size.xs, color: colors.primary, marginTop: 4, fontWeight: typography.weight.semibold },
  tier: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, marginLeft: spacing.sm },
  tierText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.text },
  urgency: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, marginLeft: spacing.sm },
  urgencyText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.text },
  priceTag: { fontWeight: typography.weight.bold, color: colors.primary, fontSize: typography.size.sm, marginLeft: spacing.sm },
  empty: { alignItems: 'center', paddingTop: spacing['2xl'] },
  emptyText: { color: colors.textSecondary, marginTop: spacing.md },
});
