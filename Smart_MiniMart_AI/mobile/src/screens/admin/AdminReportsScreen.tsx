import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/theme';
import { radius, spacing, typography } from '@/theme/typography';
import { api } from '@/services/api';
import { useRevenueReport } from '@/services/queries';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { formatVnd } from '@/utils/format';

const PERIODS = [
  { label: '7 ngày', days: 7 },
  { label: '30 ngày', days: 30 },
  { label: 'Quý này', days: 90 },
  { label: 'Tất cả', days: 0 },
] as const;

type Period = (typeof PERIODS)[number]['days'];

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AdminReportsScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>(30);
  const [exporting, setExporting] = useState(false);
  const params = useMemo(() => {
    if (period === 0) return {};
    const from = new Date();
    from.setDate(from.getDate() - period);
    return { from: dateToIso(from) };
  }, [period]);
  const { data, isLoading, isError } = useRevenueReport(params);

  const maxRevenue = Math.max(1, ...(data?.daily ?? []).map((d) => d.revenue));
  const maxBars = Math.min(data?.daily?.length ?? 0, 31);

  async function handleExport() {
    setExporting(true);
    try {
      const resp = await api.get('/orders/report/export', {
        params,
        responseType: 'text',
      });
      const csv: string = resp.data ?? '';
      const file = new File(Paths.cache, `minimart-report-${dateToIso(new Date())}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Xuất báo cáo CSV',
        });
      }
    } catch (e) {
      Alert.alert('Xuất báo cáo thất bại', (e as Error)?.message ?? 'Đã có lỗi xảy ra', [
        { text: 'OK' },
      ]);
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.periodRow, { backgroundColor: colors.bgAlt }]}>
        {PERIODS.map((p) => {
          const active = p.days === period;
          return (
            <Pressable
              key={p.days}
              onPress={() => setPeriod(p.days)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface }]}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 48 }}>
        {isLoading ? (
          <ListRowSkeleton count={4} />
        ) : isError ? (
          <EmptyState icon="⚠️" title="Không tải được báo cáo" description="Kiểm tra kết nối và thử lại" />
        ) : (
          <>
            <View style={styles.kpiGrid}>
              <StatCard label="Doanh thu" value={formatVnd(data?.totalRevenue ?? 0)} icon="₫" variant="primary" style={{ marginRight: 6 }} />
              <StatCard label="Số đơn" value={data?.totalOrders ?? 0} icon="🛒" variant="info" style={{ marginLeft: 6 }} />
            </View>
            <View style={styles.kpiGrid}>
              <StatCard label="TB mỗi đơn" value={formatVnd(data?.avgOrderValue ?? 0)} icon="📊" variant="ai" style={{ marginRight: 6 }} />
              <StatCard label="Chưa hoàn tất" value={Object.values(data?.statusBreakdown ?? {}).reduce((s, n) => s + n, 0) - (data?.totalOrders ?? 0)} icon="⏳" variant="gold" style={{ marginLeft: 6 }} />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Doanh thu theo ngày</Text>
            <Card variant="elevated" padding={14}>
              {(data?.daily ?? []).length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Không có đơn hoàn tất trong khoảng này
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartRow}>
                  {(data?.daily ?? []).slice(-maxBars).map((d) => {
                    const h = Math.max(4, Math.round((d.revenue / maxRevenue) * 96));
                    return (
                      <View key={d.date} style={styles.barCol}>
                        <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                          {d.revenue >= 1_000_000 ? `${(d.revenue / 1_000_000).toFixed(1)}tr` : `${Math.round(d.revenue / 1000)}k`}
                        </Text>
                        <View style={[styles.barTrack, { backgroundColor: colors.bgAlt }]}>
                          <View
                            style={[
                              styles.barFill,
                              { height: `${h}%` as `${number}%`, backgroundColor: colors.primary },
                            ]}
                          />
                        </View>
                        <Text style={[styles.barLabel, { color: colors.textMuted }]}>
                          {d.date.slice(5)}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </Card>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top sản phẩm bán chạy</Text>
            <Card variant="elevated" padding={6}>
              {(data?.topProducts ?? []).length === 0 ? (
                <EmptyState icon="🏷️" title="Chưa có dữ liệu sản phẩm" />
              ) : (
                (data?.topProducts ?? []).map((p, i) => (
                  <View key={p.productId} style={styles.productRow}>
                    <View style={[styles.rank, { backgroundColor: colors.primarySoft }]}>
                      <Text style={[styles.rankText, { color: colors.primary }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={[styles.productMeta, { color: colors.textMuted }]}>
                        {p.quantity} bán · {formatVnd(p.revenue)}
                      </Text>
                    </View>
                    <Text style={[styles.productRev, { color: colors.primary }]}>{formatVnd(p.revenue)}</Text>
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>

      <View style={[styles.exportBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Button
          title="Xuất file CSV"
          loading={exporting}
          fullWidth
          variant="primary"
          onPress={handleExport}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    minWidth: 72,
    alignItems: 'center',
  },
  chipText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  kpiGrid: { flexDirection: 'row', marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold, marginBottom: spacing.sm, marginTop: spacing.md },
  chartRow: { alignItems: 'flex-end', gap: spacing.sm, paddingVertical: spacing.sm },
  barCol: { width: 44, alignItems: 'center' },
  barValue: { fontSize: 9, marginBottom: 2 },
  barTrack: {
    width: 24,
    height: 96,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radius.sm,
    minHeight: 4,
  },
  barLabel: { fontSize: 9, marginTop: 4 },
  emptyText: { textAlign: 'center', paddingVertical: spacing.xl, fontSize: typography.size.sm },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  productName: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  productMeta: { fontSize: typography.size.xs, marginTop: 2 },
  productRev: { fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  exportBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});