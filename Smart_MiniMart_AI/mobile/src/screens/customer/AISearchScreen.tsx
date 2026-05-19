import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAISearch } from '@/services/queries';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/theme';

const SUGGESTIONS = [
  'Đồ ăn sáng dưới 30k',
  'Nước uống ít đường',
  'Combo 100k cho bữa tối',
  'Bánh kẹo cho trẻ em',
  'Đồ vệ sinh cá nhân',
];

export function AISearchScreen() {
  const nav = useNavigation<any>();
  const [query, setQuery] = useState('');
  const search = useAISearch();
  const result = search.data;

  const handleSearch = () => {
    if (!query.trim()) return;
    search.mutate(query.trim());
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Search 🤖</Text>
        <Text style={styles.subtitle}>Tả nhu cầu bằng ngôn ngữ tự nhiên</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder='VD: "đồ ăn sáng dưới 30k"'
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Button title="Tìm" size="md" onPress={handleSearch}
          loading={search.isPending} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
        {!result && !search.isPending && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <Text style={styles.suggestionTitle}>Gợi ý câu hỏi</Text>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestion}
                onPress={() => { setQuery(s); search.mutate(s); }}>
                <Text style={styles.suggestionText}>💡 {s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {search.isPending && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang phân tích yêu cầu của bạn...</Text>
          </View>
        )}

        {result && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            {result.explanation && (
              <View style={styles.aiBubble}>
                <Text style={styles.aiBubbleLabel}>{result.usedAI ? '🤖 AI hiểu yêu cầu' : '🔍 Tìm thông minh'}</Text>
                <Text style={styles.aiBubbleText}>{result.explanation}</Text>
              </View>
            )}

            <Text style={styles.resultCount}>
              {result.products.length} sản phẩm phù hợp
            </Text>

            <View style={styles.gridWrap}>
              {result.products.map((p) => (
                <ProductCard key={p.id} product={p}
                  onPress={() => nav.navigate('ProductDetail', { idOrSlug: p.slug })} />
              ))}
            </View>

            {result.products.length === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 56 }}>🤔</Text>
                <Text style={styles.emptyText}>Không tìm thấy sản phẩm phù hợp.{"\n"}Thử mô tả khác nhé.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.text },
  subtitle: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  searchBox: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.base,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    fontSize: typography.size.base, color: colors.text, backgroundColor: colors.surface,
  },
  suggestionTitle: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  suggestion: {
    backgroundColor: colors.surface, padding: spacing.base, borderRadius: radius.base,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  suggestionText: { fontSize: typography.size.sm, color: colors.text },
  loading: { alignItems: 'center', paddingTop: spacing['2xl'] },
  loadingText: { color: colors.textSecondary, marginTop: spacing.md },
  aiBubble: {
    backgroundColor: colors.primaryLight, padding: spacing.base,
    borderRadius: radius.base, marginTop: spacing.base,
  },
  aiBubbleLabel: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primaryDark, marginBottom: 4 },
  aiBubbleText: { fontSize: typography.size.sm, color: colors.text, lineHeight: 20 },
  resultCount: { color: colors.textSecondary, marginVertical: spacing.md, fontSize: typography.size.sm },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  empty: { alignItems: 'center', padding: spacing.xl },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
});
