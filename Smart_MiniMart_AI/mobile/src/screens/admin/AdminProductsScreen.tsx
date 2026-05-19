import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProducts } from '@/services/queries';
import { colors, radius, spacing, typography } from '@/theme';
import { formatVnd } from '@/utils/format';

export function AdminProductsScreen() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProducts({ search, limit: 50 });
  const items = data?.items ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Sản phẩm ({data?.total ?? 0})</Text>
        <TextInput
          value={search} onChangeText={setSearch}
          placeholder="🔍 Tìm theo tên, SKU, brand"
          placeholderTextColor={colors.textTertiary}
          style={styles.search}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => {
            const lowStock = item.stock < (item as any).minStock;
            return (
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.sku}>{item.sku}</Text>
                  {lowStock && (
                    <Text style={styles.lowStock}>⚠️ Sắp hết hàng</Text>
                  )}
                </View>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.price}>{formatVnd(Number(item.price))}</Text>
                  <Text style={styles.stock}>Tồn: {item.stock} {item.unit}</Text>
                </View>
                <Text style={styles.category}>{(item as any).category?.name}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>📦</Text>
              <Text style={styles.emptyText}>Không có sản phẩm</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  search: {
    marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, fontSize: typography.size.sm, color: colors.text,
  },
  card: { backgroundColor: colors.surface, padding: spacing.base, borderRadius: radius.base, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  sku: { fontSize: typography.size.xs, color: colors.textSecondary, fontWeight: typography.weight.semibold },
  lowStock: { fontSize: typography.size.xs, color: colors.danger, fontWeight: typography.weight.semibold },
  name: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  price: { fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.primary },
  stock: { fontSize: typography.size.sm, color: colors.textSecondary },
  category: { fontSize: typography.size.xs, color: colors.textTertiary, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: spacing['2xl'] },
  emptyText: { color: colors.textSecondary, marginTop: spacing.md },
});
