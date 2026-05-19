import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useProducts } from '@/services/queries';
import { ProductCard } from '@/components/ProductCard';
import { colors, spacing, typography } from '@/theme';

export function ProductListScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const categoryId = route.params?.categoryId;

  const [page] = useState(1);
  const { data, isLoading } = useProducts({ categoryId, page, limit: 30 });
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
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => nav.navigate('ProductDetail', { idOrSlug: item.slug })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>Chưa có sản phẩm nào</Text>
          </View>
        }
        ListHeaderComponent={
          <Text style={styles.count}>{items.length} sản phẩm</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg },
  count: { color: colors.textSecondary, marginBottom: spacing.md, fontSize: typography.size.sm },
  empty: { alignItems: 'center', paddingTop: spacing['3xl'] },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.base },
  emptyText: { color: colors.textSecondary, fontSize: typography.size.base },
});
