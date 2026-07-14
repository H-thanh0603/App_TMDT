import React from 'react';
import { ScrollView, StyleSheet, Text, View, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '@/theme';

interface RouteParams {
  qr: {
    qrDataUrl?: string;
    qrImageUrl?: string;
    bankBin: string;
    accountNo: string;
    accountName: string;
    amount: number;
    addInfo: string;
  };
  orderNumber?: string;
}

export function VietQrScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { qr, orderNumber } = route.params as RouteParams;

  const qrSource = qr.qrDataUrl
    ? { uri: qr.qrDataUrl }
    : qr.qrImageUrl
    ? { uri: qr.qrImageUrl }
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thanh toán chuyển khoản</Text>
        <Text style={styles.headerSub}>Mã đơn: #{orderNumber}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.qrCard}>
          {qrSource ? (
            <Image source={qrSource} style={styles.qr} resizeMode="contain" />
          ) : (
            <Text style={styles.qrFallback}>Không tạo được mã QR. Vui lòng dùng STK bên dưới.</Text>
          )}
          <Text style={styles.scanHint}>Mở app ngân hàng, quét mã để chuyển khoản</Text>
        </View>

        <View style={styles.infoCard}>
          <Row label="Ngân hàng (BIN)" value={qr.bankBin} />
          <Row label="Số tài khoản" value={qr.accountNo} />
          <Row label="Chủ tài khoản" value={qr.accountName} />
          <Row label="Số tiền" value={`${qr.amount.toLocaleString('vi-VN')} đ`} highlight />
          <Row label="Nội dung CK" value={qr.addInfo} />
        </View>

        <Text style={styles.note}>
          Sau khi chuyển khoản, shop sẽ xác nhận thủ công và cập nhật đơn thành “Đã thanh toán”.
          Vui lòng giữ nguyên nội dung chuyển khoản.
        </Text>

        <Pressable style={styles.btn} onPress={() => nav.navigate('Orders')}>
          <Text style={styles.btnText}>Xem đơn hàng của tôi</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: colors.primary, fontWeight: '800' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  header: { padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  body: { padding: 16, gap: 14 },
  qrCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  qr: { width: 240, height: 240 },
  qrFallback: { fontSize: 13, color: colors.danger, textAlign: 'center' },
  scanHint: { fontSize: 12, color: colors.textMuted, marginTop: 12, textAlign: 'center' },
  infoCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.bgAlt },
  rowLabel: { fontSize: 13, color: colors.textSecondary },
  rowValue: { fontSize: 13, fontWeight: '700', color: colors.text, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  note: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
