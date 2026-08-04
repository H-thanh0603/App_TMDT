import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useConfirmVietQr } from '@/services/queries';
import { colors } from '@/theme/colors';

export function VietQrConfirmationModal({ order, onClose }: { order: any; onClose: () => void }) {
  const confirm = useConfirmVietQr();
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const submit = async () => {
    if (reference.trim().length < 3) return Alert.alert('Thiếu mã giao dịch', 'Nhập mã giao dịch ngân hàng để xác nhận.');
    try {
      await confirm.mutateAsync({ orderId: order.id, bankTransactionRef: reference.trim(), note: note.trim() || undefined });
      onClose();
    } catch (error: any) {
      Alert.alert('Không thể xác nhận', error?.response?.data?.message ?? 'Vui lòng thử lại.');
    }
  };
  return (
    <Modal visible={!!order} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Xác nhận VietQR</Text>
          <Text style={styles.subtitle}>Đơn #{order?.orderNumber}. Kiểm tra sao kê trước khi xác nhận.</Text>
          <TextInput value={reference} onChangeText={setReference} placeholder="Mã giao dịch ngân hàng" style={styles.input} autoCapitalize="characters" />
          <TextInput value={note} onChangeText={setNote} placeholder="Ghi chú (không bắt buộc)" style={styles.input} />
          <View style={styles.actions}>
            <Pressable style={styles.cancel} onPress={onClose}><Text>Hủy</Text></Pressable>
            <Pressable style={styles.confirm} disabled={confirm.isPending} onPress={() => void submit()}><Text style={styles.confirmText}>{confirm.isPending ? 'Đang lưu...' : 'Xác nhận đã nhận tiền'}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text }, subtitle: { color: colors.textSecondary, fontSize: 13 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 }, cancel: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: colors.bgAlt },
  confirm: { flex: 2, alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: colors.primary }, confirmText: { color: '#fff', fontWeight: '700' },
});
