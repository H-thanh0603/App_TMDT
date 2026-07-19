import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAIProviders } from '@/services/queries';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { colors, radius, spacing, typography } from '@/theme';

const TYPE_LABELS: Record<string, string> = {
  SYSTEM_DEFAULT: 'Mặc định hệ thống',
  DEEPSEEK: 'DeepSeek',
  OPENAI_COMPATIBLE: 'OpenAI compatible',
  ANTHROPIC: 'Anthropic Claude',
  GEMINI: 'Google Gemini',
  CUSTOM: 'Custom endpoint',
  MOCK: 'Mock AI',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: colors.success,
  DISABLED: colors.textTertiary,
  ERROR: colors.danger,
};

export function AIProvidersScreen() {
  const { data: providers = [], isLoading, isError, refetch, isFetching } = useAIProviders();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Providers</Text>
        <Text style={styles.subtitle}>{providers.length} provider được cấu hình</Text>
      </View>

      {isLoading && providers.length === 0 && !isError ? (
        <ListRowSkeleton count={4} />
      ) : isError && providers.length === 0 ? (
        <ErrorState title="Không tải được providers" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          renderItem={({ item }: any) => (
            <View style={[styles.card, item.isSystemDefault && styles.cardDefault]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.isSystemDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.type}>{TYPE_LABELS[item.type] ?? item.type}</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
              </View>

              {item.baseUrl && (
                <Text style={styles.url} numberOfLines={1}>🔗 {item.baseUrl}</Text>
              )}
              {item.defaultModel && (
                <Text style={styles.model}>🤖 Model: {item.defaultModel}</Text>
              )}
              {item.apiKeyMasked && (
                <Text style={styles.apiKey}>🔑 {item.apiKeyMasked}</Text>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.actionText}>Test connection</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.actionText}>Sửa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🔌"
              title="Chưa có provider"
              description="Cấu hình provider AI trong backend/seed để bắt đầu."
              actionLabel="Tải lại"
              onAction={() => refetch()}
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
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  subtitle: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: colors.surface, padding: spacing.base, borderRadius: radius.base, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardDefault: { borderColor: colors.roleAiManager, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.text },
  type: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  defaultBadge: { backgroundColor: colors.roleAiManager, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  defaultText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  url: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: spacing.sm },
  model: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  apiKey: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2, fontFamily: 'monospace' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  actionBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  actionText: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.text },
});
