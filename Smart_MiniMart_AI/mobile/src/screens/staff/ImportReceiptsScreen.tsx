import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useImportReceipts } from '@/services/queries';
import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDateTime, formatVnd } from '@/utils/format';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: colors.textTertiary,
  OCR_PROCESSING: colors.info,
  OCR_DONE: colors.warning,
  REVIEWED: colors.accent,
  CONFIRMED: colors.success,
  REJECTED: colors.danger,
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  OCR_PROCESSING: 'Đang OCR',
  OCR_DONE: 'OCR xong - chờ duyệt',
  REVIEWED: 'Đã review',
  CONFIRMED: 'Đã nhập kho',
  REJECTED: 'Bị từ chối',
};

export function ImportReceiptsScreen() {
  const nav = useNavigation<any>();
  const { data, isLoading } = useImportReceipts();
  const items = data?.items ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Nhập hàng</Text>
        <Button title="📷 Quét phiếu" size="sm" onPress={() => nav.navigate('OCRScan')} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}
              onPress={() => nav.navigate('ReceiptDetail', { id: item.id })}>
              <View style={styles.row}>
                <Text style={styles.receiptNumber}>{item.receiptNumber}</Text>
                <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
              <Text style={styles.supplier}>{item.supplierName}</Text>
              <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
              <View style={styles.row}>
                <Text style={styles.itemCount}>
                  {item._count?.items ?? 0} sản phẩm
                </Text>
                <Text style={styles.total}>{formatVnd(Number(item.totalAmount ?? 0))}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 56 }}>📄</Text>
              <Text style={styles.emptyText}>Chưa có phiếu nhập nào</Text>
              <Text style={styles.emptyHint}>Bấm "Quét phiếu" để bắt đầu</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.base, padding: spacing.base, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  receiptNumber: { fontWeight: typography.weight.bold, color: colors.text },
  status: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  supplier: { fontSize: typography.size.sm, color: colors.text, marginTop: 4 },
  date: { fontSize: typography.size.xs, color: colors.textTertiary, marginTop: 2 },
  itemCount: { fontSize: typography.size.sm, color: colors.textSecondary },
  total: { fontWeight: typography.weight.bold, color: colors.primary },
  empty: { alignItems: 'center', paddingTop: spacing['2xl'] },
  emptyText: { color: colors.text, marginTop: spacing.md, fontSize: typography.size.base, fontWeight: typography.weight.semibold },
  emptyHint: { color: colors.textSecondary, marginTop: spacing.xs, fontSize: typography.size.sm },
});
