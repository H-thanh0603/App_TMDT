import { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  useImportReceipt, useUpdateReceiptItems, useConfirmReceipt,
} from '@/services/queries';
import { Button } from '@/components/Button';
import { colors } from '@/theme/colors';
import { formatVnd } from '@/utils/format';

export function ReceiptDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const id = route.params?.id;
  const { data: receipt, isLoading } = useImportReceipt(id);
  const updateItems = useUpdateReceiptItems();
  const confirm = useConfirmReceipt();

  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (receipt?.items) setItems(receipt.items);
  }, [receipt]);

  if (isLoading || !receipt) {
    return <SafeAreaView style={[styles.container, styles.center]}><Text>Đang tải...</Text></SafeAreaView>;
  }

  const total = items.reduce((s, it) => s + Number(it.unitPrice) * Number(it.quantity), 0);
  const isConfirmed = receipt.status === 'CONFIRMED';

  const update = (i: number, key: string, val: any) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: val };
    setItems(next);
  };

  const saveDraft = async () => {
    try {
      await updateItems.mutateAsync({ id, items });
      Alert.alert('Đã lưu', 'Đã cập nhật danh sách items');
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Lưu thất bại');
    }
  };

  const confirmReceipt = () => {
    Alert.alert('Xác nhận nhập kho',
      `Tổng ${items.length} sản phẩm, ${formatVnd(total)}. Sau khi xác nhận, tồn kho sẽ được cập nhật.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xác nhận', style: 'destructive', onPress: async () => {
          try {
            await updateItems.mutateAsync({ id, items });
            await confirm.mutateAsync(id);
            Alert.alert('Thành công', 'Đã nhập kho.', [{ text: 'OK', onPress: () => nav.goBack() }]);
          } catch (err: any) {
            Alert.alert('Lỗi', err.response?.data?.message ?? 'Xác nhận thất bại');
          }
        }},
      ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.headerCard}>
          <Text style={styles.receiptNumber}>{receipt.receiptNumber}</Text>
          <Text style={styles.supplier}>NCC: {receipt.supplierName}</Text>
          {receipt.ocrEngine && (
            <Text style={styles.meta}>
              OCR engine: {receipt.ocrEngine} • Confidence: {((receipt.ocrConfidence ?? 0) * 100).toFixed(0)}%
            </Text>
          )}
          {receipt.ocrConfidence && receipt.ocrConfidence < 0.7 && (
            <Text style={styles.warning}>
              ⚠️ Độ tin cậy thấp — vui lòng kiểm tra kỹ trước khi xác nhận
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Sản phẩm ({items.length})</Text>

        {items.map((it, i) => (
          <View key={it.id ?? i} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemIndex}>#{i + 1}</Text>
              {it.confidence !== undefined && (
                <Text style={[styles.itemConf, it.confidence < 0.7 && { color: colors.warning }]}>
                  {(it.confidence * 100).toFixed(0)}%
                </Text>
              )}
            </View>

            <Text style={styles.fieldLabel}>Tên sản phẩm</Text>
            <TextInput
              value={it.productName}
              onChangeText={(v) => update(i, 'productName', v)}
              style={styles.input}
              editable={!isConfirmed}
            />

            <View style={styles.row3}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>SL</Text>
                <TextInput
                  value={String(it.quantity)}
                  onChangeText={(v) => update(i, 'quantity', parseInt(v, 10) || 0)}
                  style={styles.input}
                  keyboardType="numeric"
                  editable={!isConfirmed}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Đơn giá</Text>
                <TextInput
                  value={String(it.unitPrice)}
                  onChangeText={(v) => update(i, 'unitPrice', parseInt(v, 10) || 0)}
                  style={styles.input}
                  keyboardType="numeric"
                  editable={!isConfirmed}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Đơn vị</Text>
                <TextInput
                  value={it.unit ?? 'cái'}
                  onChangeText={(v) => update(i, 'unit', v)}
                  style={styles.input}
                  editable={!isConfirmed}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>HSD (YYYY-MM-DD)</Text>
            <TextInput
              value={it.expiryDate ? String(it.expiryDate).slice(0, 10) : ''}
              onChangeText={(v) => update(i, 'expiryDate', v)}
              style={styles.input}
              placeholder="2026-12-31"
              placeholderTextColor={colors.textTertiary}
              editable={!isConfirmed}
            />

            <Text style={styles.lineTotal}>
              Thành tiền: {formatVnd(Number(it.unitPrice) * Number(it.quantity))}
            </Text>
          </View>
        ))}

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
          <Text style={styles.totalValue}>{formatVnd(total)}</Text>
        </View>
      </ScrollView>

      {!isConfirmed && (
        <View style={styles.footer}>
          <Button title="Lưu nháp" onPress={saveDraft} variant="outline"
            loading={updateItems.isPending} style={{ flex: 1 }} />
          <Button title="Xác nhận nhập kho" onPress={confirmReceipt}
            loading={confirm.isPending} style={{ flex: 1 }} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 12 },
  receiptNumber: { fontSize: 17, fontWeight: '800', color: colors.text },
  supplier: { fontSize: 13, color: colors.text, marginTop: 4 },
  meta: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  warning: { fontSize: 11, color: colors.warning, marginTop: 8, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  itemCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemIndex: { fontWeight: '800', color: colors.text },
  itemConf: { fontSize: 11, color: colors.success, fontWeight: '600' },
  fieldLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4, marginBottom: 2 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8, fontSize: 13, color: colors.text, backgroundColor: colors.bgSecondary },
  row3: { flexDirection: 'row', gap: 8 },
  lineTotal: { textAlign: 'right', marginTop: 8, fontSize: 13, fontWeight: '600', color: colors.primary },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primaryLight, padding: 16, borderRadius: 12, marginTop: 12 },
  totalLabel: { fontWeight: '800', color: colors.primaryDark },
  totalValue: { fontSize: 17, fontWeight: '800', color: colors.primaryDark },
  footer: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
