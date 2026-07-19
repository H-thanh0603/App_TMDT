import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAILogs } from '@/services/queries';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { colors, radius, spacing, typography } from '@/theme';
import { formatRelativeTime } from '@/utils/format';

const STATUS_COLORS: Record<string, string> = {
  success: colors.success,
  fallback: colors.warning,
  error: colors.danger,
  timeout: colors.danger,
};

export function AILogsScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useAILogs({ limit: 50 });
  const items = data?.items ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Logs</Text>
        <Text style={styles.subtitle}>{data?.total ?? 0} requests</Text>
      </View>

      {isLoading && !data ? (
        <ListRowSkeleton count={6} />
      ) : isError && !data ? (
        <ErrorState title="Không tải được AI logs" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l: any) => l.id}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          renderItem={({ item }: any) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] ?? colors.textTertiary }]} />
                <Text style={styles.taskType}>{item.taskType}</Text>
                <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.metaLine}>
                {item.providerName ?? 'Unknown'} • {item.mode} • {item.model ?? '-'}
              </Text>
              {item.inputSummary && (
                <Text style={styles.summary} numberOfLines={1}>📥 {item.inputSummary}</Text>
              )}
              {item.outputSummary && (
                <Text style={styles.summary} numberOfLines={2}>📤 {item.outputSummary}</Text>
              )}
              {item.errorMessage && (
                <Text style={styles.error} numberOfLines={1}>⚠️ {item.errorMessage}</Text>
              )}
              <View style={styles.statsRow}>
                {item.latencyMs != null && (
                  <Text style={styles.stat}>⏱ {item.latencyMs}ms</Text>
                )}
                {item.totalTokens != null && (
                  <Text style={styles.stat}>🔢 {item.totalTokens} tok</Text>
                )}
                {item.costUsd != null && Number(item.costUsd) > 0 && (
                  <Text style={styles.stat}>💰 ${Number(item.costUsd).toFixed(4)}</Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="📜"
              title="Chưa có log nào"
              description="Chạy AI Search / Chat để sinh log mới."
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
  card: { backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  taskType: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text, flex: 1 },
  time: { fontSize: typography.size.xs, color: colors.textTertiary },
  metaLine: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 4 },
  summary: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 4 },
  error: { fontSize: typography.size.xs, color: colors.danger, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  stat: { fontSize: typography.size.xs, color: colors.text, fontWeight: typography.weight.semibold },
});
