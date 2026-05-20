import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '@/theme/colors';
import { useOrder, useCreateVnpay } from '@/services/queries';
import { formatVnd } from '@/utils/format';

const STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  PENDING:    { text: 'Chờ xác nhận', color: '#92400E', bg: '#FEF3C7' },
  CONFIRMED:  { text: 'Đã xác nhận',  color: '#1E40AF', bg: '#DBEAFE' },
  PREPARING:  { text: 'Đang chuẩn bị', color: '#5B21B6', bg: '#EDE9FE' },
  DELIVERING: { text: 'Đang giao',     color: '#0E7490', bg: '#CFFAFE' },
  COMPLETED:  { text: 'Hoàn thành',    color: '#059669', bg: '#D1FAE5' },
  CANCELED:   { text: 'Đã hủy',        color: '#991B1B', bg: '#FEE2E2' },
};

const PAYMENT_LABELS: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng',
  VNPAY_SANDBOX: 'VNPay',
  BANK: 'Chuyển khoản ngân hàng',
  QR_DEMO: 'QR Code',
  WALLET_DEMO: 'Ví điện tử',
};

export function OrderDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const orderId = route.params?.id;
  const { data: order, isLoading } = useOrder(orderId);
  const vnpay = useCreateVnpay();

  if (isLoading || !order) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.PENDING;
  const canPay = order.paymentStatus !== 'PAID' && order.paymentMethod === 'VNPAY_SANDBOX';

  const payNow = async () => {
    try {
      const res = await vnpay.mutateAsync({ orderId: order.id });
      Alert.alert(
        'Thanh toán VNPay',
        `URL thanh toán đã sẵn sàng. Trong app thật sẽ mở WebView. Demo URL: ${res.url.slice(0, 80)}...`,
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể tạo URL thanh toán');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Chi tiết đơn</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          <Text style={[styles.orderNumber, { color: status.color }]}>#{order.orderNumber}</Text>
        </View>

        {/* Address */}
        {order.address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Địa chỉ giao hàng</Text>
            <Text style={styles.addrName}>{order.address.recipient}</Text>
            <Text style={styles.addrPhone}>{order.address.phone}</Text>
            <Text style={styles.addrLine}>
              {[order.address.line1, order.address.ward, order.address.district, order.address.city]
                .filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛒 Sản phẩm ({order.items?.length || 0})</Text>
          {order.items?.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemImg}>
                <Text style={{ fontSize: 24 }}>📦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.itemQty}>{formatVnd(Number(item.unitPrice))} × {item.quantity}</Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatVnd(Number(item.subtotal))}</Text>
            </View>
          ))}
        </View>

        {/* Payment summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Thanh toán</Text>
          <Row label="Tạm tính" value={formatVnd(Number(order.subtotal || 0))} />
          {Number(order.discountAmount || 0) > 0 && (
            <Row label="Giảm giá" value={`- ${formatVnd(Number(order.discountAmount))}`} valueColor={colors.danger} />
          )}
          <Row label="Phí giao hàng" value={formatVnd(Number(order.shippingFee || 0))} />
          <View style={styles.divider} />
          <Row label="Tổng cộng" value={formatVnd(Number(order.totalAmount))} bold />
          <Row label="Phương thức" value={PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod} />
          <Row
            label="Trạng thái thanh toán"
            value={order.paymentStatus === 'PAID' ? '✓ Đã thanh toán' : 'Chưa thanh toán'}
            valueColor={order.paymentStatus === 'PAID' ? colors.success : colors.warning}
          />
          {Number(order.loyaltyEarned || 0) > 0 && (
            <Row label="Điểm tích lũy" value={`+${order.loyaltyEarned} điểm`} valueColor={colors.gold} />
          )}
        </View>

        {/* Note */}
        {order.note && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Ghi chú</Text>
            <Text style={styles.noteText}>{order.note}</Text>
          </View>
        )}

        {/* Promotion */}
        {order.promotionCode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Khuyến mãi</Text>
            <View style={styles.promoBadge}>
              <Text style={styles.promoCode}>{order.promotionCode}</Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        {canPay && (
          <Pressable style={styles.payBtn} onPress={payNow}>
            <Text style={styles.payBtnText}>Thanh toán ngay</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold, valueColor }: any) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: '700', color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '800', fontSize: 18 }, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: 'white',
  },
  back: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  statusBanner: {
    margin: 16, padding: 16, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusText: { fontSize: 16, fontWeight: '800' },
  orderNumber: { fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 10 },
  addrName: { fontSize: 15, fontWeight: '700', color: colors.text },
  addrPhone: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  addrLine: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  itemImg: {
    width: 50, height: 50, borderRadius: 8, backgroundColor: colors.bgAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  itemQty: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemSubtotal: { fontSize: 14, fontWeight: '700', color: colors.text },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: { color: colors.textSecondary, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  noteText: { color: colors.textSecondary, fontStyle: 'italic' },
  promoBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.primarySoft,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  promoCode: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
  payBtn: {
    margin: 16, backgroundColor: colors.primary,
    padding: 16, borderRadius: 12, alignItems: 'center',
  },
  payBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
