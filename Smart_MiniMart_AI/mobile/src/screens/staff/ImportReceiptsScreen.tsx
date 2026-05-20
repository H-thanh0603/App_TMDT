import React from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text, View, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useImportReceipts } from '@/services/queries';
import { Badge } from '@/components/Badge';
import { colors } from '@/theme/colors';
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
        <Pressable style={styles.scanBtn} onPress={() => nav.navigate('OCRScan')}>
          <Text style={styles.scanBtnText}>📷 Quét phiếu</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <Pressable style={styles.card}
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
            </Pressable>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  receiptNumber: { fontWeight: '800', color: colors.text },
  status: { fontSize: 11, fontWeight: '600' },
  supplier: { fontSize: 13, color: colors.text, marginTop: 4 },
  date: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  itemCount: { fontSize: 13, color: colors.textSecondary },
  total: { fontWeight: '800', color: colors.primary },
  empty: { alignItems: 'center', paddingTop: 32 },
  emptyText: { color: colors.text, marginTop: 12, fontSize: 14, fontWeight: '600' },
  emptyHint: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  scanBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  scanBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
});
