import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAIOverview, useAITaskConfigs } from '@/services/queries';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { colors, radius, spacing, typography } from '@/theme';

const TASK_LABELS: Record<string, string> = {
  AI_SEARCH: 'AI Search',
  AI_ASSISTANT: 'AI Assistant',
  OCR_PARSE: 'OCR Parser',
  ANALYTICS_SLOWMOVING: 'Phân tích bán chậm',
  PROMOTION_SUGGEST: 'Gợi ý KM',
  REVIEW_SUMMARY: 'Tóm tắt review',
  CONTENT_GENERATION: 'Sinh nội dung',
  RESTOCK_SUGGEST: 'Gợi ý nhập',
};

export function AIControlCenterScreen() {
  const overviewQ = useAIOverview();
  const tasksQ = useAITaskConfigs();
  const overview = overviewQ.data;
  const tasks = tasksQ.data ?? [];

  if (overviewQ.isLoading && !overview) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ListRowSkeleton count={6} />
      </SafeAreaView>
    );
  }

  if (overviewQ.isError && !overview) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <ErrorState
          title="Không tải được AI Control Center"
          onRetry={() => {
            overviewQ.refetch();
            tasksQ.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  if (!overview) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <EmptyState
          icon="🎛️"
          title="Chưa có dữ liệu AI"
          description="Seed provider/task config rồi thử lại."
          actionLabel="Tải lại"
          onAction={() => overviewQ.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Control Center 🎛️</Text>
          <Text style={styles.subtitle}>Tổng quan hệ thống AI/OCR</Text>
        </View>

        <View style={styles.kpiGrid}>
          <View style={[styles.kpi, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.kpiLabel}>Provider</Text>
            <Text style={[styles.kpiValue, { color: '#92400E' }]}>{overview.providers}</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: '#DBEAFE' }]}>
            <Text style={styles.kpiLabel}>Task configs</Text>
            <Text style={[styles.kpiValue, { color: colors.info }]}>{overview.taskConfigs}</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: '#D1FAE5' }]}>
            <Text style={styles.kpiLabel}>Request 24h</Text>
            <Text style={[styles.kpiValue, { color: colors.primaryDark }]}>{overview.last24h}</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.kpiLabel}>Error rate 24h</Text>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>{overview.errorRate}%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cấu hình tác vụ AI</Text>
        {tasks.length === 0 ? (
          <EmptyState
            icon="⚙️"
            title="Chưa có task config"
            description="Seed AI task mapping để hiển thị tại đây."
            actionLabel="Tải lại"
            onAction={() => tasksQ.refetch()}
            actionVariant="outline"
          />
        ) : (
          tasks.map((t: any) => (
            <View key={t.id} style={styles.taskCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskName}>{TASK_LABELS[t.taskType] ?? t.taskType}</Text>
                <Text style={styles.taskMode}>
                  Mode: {t.mode}
                  {t.primaryProvider ? ` • ${t.primaryProvider.name}` : ''}
                  {t.primaryModel ? ` (${t.primaryModel})` : ''}
                </Text>
              </View>
              <View style={[styles.statusDot, t.isEnabled && { backgroundColor: colors.success }]} />
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Lưu lượng theo task (24h)</Text>
        {(overview.taskBreakdown?.length ?? 0) === 0 ? (
          <Text style={styles.emptyBreakdown}>Chưa có request trong 24h.</Text>
        ) : (
          overview.taskBreakdown?.map((t: any) => (
            <View key={t.taskType} style={styles.row}>
              <Text style={styles.rowLabel}>{TASK_LABELS[t.taskType] ?? t.taskType}</Text>
              <Text style={styles.rowValue}>{t.count}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  subtitle: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
  kpi: { width: '48%', padding: spacing.base, borderRadius: radius.base },
  kpiLabel: { fontSize: typography.size.xs, color: colors.textSecondary },
  kpiValue: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, marginTop: 4 },
  sectionTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.text, marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.base, marginHorizontal: spacing.lg, borderRadius: radius.base, marginBottom: spacing.sm },
  taskName: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.text },
  taskMode: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textTertiary, marginLeft: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, padding: spacing.base, marginHorizontal: spacing.lg, marginBottom: spacing.xs, borderRadius: radius.sm },
  rowLabel: { fontSize: typography.size.sm, color: colors.text },
  rowValue: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.roleAiManager },
  emptyBreakdown: { marginHorizontal: spacing.lg, color: colors.textMuted, fontSize: typography.size.sm },
});
