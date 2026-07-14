import React, { useMemo, useState } from 'react';
import {
  Alert, FlatList, Image, StyleSheet, Text, View, Pressable, ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useCart, useUpdateCartItem, useRemoveCartItem, useCreateOrder, useAddresses,
  useCreateVnpay, useCreateVietQr,
} from '@/services/queries';
import { Badge } from '@/components/Badge';
import { colors } from '@/theme/colors';
import { formatAddress, formatVnd, estimateShippingFee } from '@/utils/format';
import type { Address, PaymentMethod } from '@/types';

type PayOption = Extract<PaymentMethod, 'COD' | 'VNPAY_SANDBOX' | 'VIETQR'>;

const PLACEHOLDER = 'https://placehold.co/120x120/png?text=SP';

export function CartScreen() {
  const nav = useNavigation<any>();
  const { data: cart, isLoading, isError, error, refetch, isFetching } = useCart();
  const { data: addresses = [] } = useAddresses();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const createOrder = useCreateOrder();
  const createVnpay = useCreateVnpay();
  const createVietQr = useCreateVietQr();
  const [paymentMethod, setPaymentMethod] = useState<PayOption>('COD');
  const [submitting, setSubmitting] = useState(false);

  const defaultAddress = (addresses.find((a: Address) => a.isDefault) ?? addresses[0]) as Address | undefined;
  const addressText = useMemo(() => formatAddress(defaultAddress), [defaultAddress]);
  const items = cart?.items ?? [];
  const subtotal = Number(cart?.subtotal ?? 0);
  const shippingFee = estimateShippingFee(subtotal);
  const total = subtotal + shippingFee;
  const busy = submitting || createOrder.isPending || createVnpay.isPending || createVietQr.isPending;

  const placeOrder = async () => {
    if (!defaultAddress) return;
    if (!items.length) {
      Alert.alert('Giỏ trống', 'Vui lòng thêm sản phẩm trước khi đặt hàng');
      return;
    }
    setSubmitting(true);
    try {
      // VIETQR maps to BANK on backend enum
      const apiPayment =
        paymentMethod === 'VIETQR' ? 'BANK' : paymentMethod;

      const order = await createOrder.mutateAsync({
        paymentMethod: apiPayment as any,
        addressId: defaultAddress.id,
      });
      const orderId = (order as any).id as string;
      const orderNumber = (order as any).orderNumber as string;

      if (paymentMethod === 'VNPAY_SANDBOX') {
        try {
          const pay = await createVnpay.mutateAsync({ orderId });
          if (pay?.url) {
            const canOpen = await Linking.canOpenURL(pay.url);
            if (canOpen) await Linking.openURL(pay.url);
            Alert.alert(
              'Đã tạo đơn — mở VNPay',
              `Mã đơn: #${orderNumber || ''}\nMở trình duyệt để thanh toán sandbox.`,
              [
                { text: 'Xem đơn', onPress: () => nav.navigate('Orders') },
                { text: 'Mở lại VNPay', onPress: () => Linking.openURL(pay.url) },
              ],
            );
            return;
          }
        } catch (payErr: any) {
          Alert.alert(
            'Đơn đã tạo — VNPay lỗi',
            `${payErr?.response?.data?.message ?? payErr?.message ?? 'Không tạo được URL VNPay'}\nMã đơn: #${orderNumber || ''}`,
            [{ text: 'Xem đơn', onPress: () => nav.navigate('Orders') }],
          );
          return;
        }
      }

      if (paymentMethod === 'VIETQR') {
        try {
          const qr = await createVietQr.mutateAsync({ orderId });
          nav.navigate('VietQr', { qr, orderNumber });
          return;
        } catch (qrErr: any) {
          Alert.alert(
            'Đơn đã tạo — VietQR lỗi',
            `${qrErr?.response?.data?.message ?? qrErr?.message ?? 'Không tạo được QR'}\nMã đơn: #${orderNumber || ''}`,
            [{ text: 'Xem đơn', onPress: () => nav.navigate('Orders') }],
          );
          return;
        }
      }

      Alert.alert(
        'Đặt hàng thành công 🎉',
        `Mã đơn: #${orderNumber || ''}\nThanh toán: COD`,
        [{ text: 'Xem đơn', onPress: () => nav.navigate('Orders') }],
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (Array.isArray(err?.response?.data?.message)
          ? err.response.data.message.join(', ')
          : null) ??
        err?.message ??
        'Đặt hàng thất bại';
      Alert.alert('Lỗi', typeof msg === 'string' ? msg : 'Đặt hàng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const checkout = () => {
    if (!defaultAddress) {
      Alert.alert('Chưa có địa chỉ', 'Vui lòng thêm địa chỉ giao hàng trước', [
        { text: 'Hủy' },
        { text: 'Thêm địa chỉ', onPress: () => nav.navigate('Addresses') },
      ]);
      return;
    }
    if (!items.length) {
      Alert.alert('Giỏ trống', 'Thêm sản phẩm trước khi đặt hàng');
      return;
    }
    const payLabel =
      paymentMethod === 'COD'
        ? 'COD (tiền mặt)'
        : paymentMethod === 'VIETQR'
          ? 'VietQR (chuyển khoản)'
          : 'VNPay sandbox';
    Alert.alert(
      'Xác nhận đặt hàng',
      `Tổng tiền: ${formatVnd(total)}\nPhí ship: ${shippingFee === 0 ? 'Miễn phí' : formatVnd(shippingFee)}\nThanh toán: ${payLabel}\nGiao đến: ${addressText || '(chưa có)'}`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đặt hàng', onPress: () => { void placeOrder(); } },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.emptyTitle}>Không tải được giỏ hàng</Text>
        <Text style={styles.emptyText}>{(error as any)?.message ?? 'Thử lại sau'}</Text>
        <Pressable style={styles.exploreBtn} onPress={() => refetch()}>
          <Text style={styles.exploreBtnText}>{isFetching ? 'Đang tải…' : 'Thử lại'}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!items.length) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={{ fontSize: 48 }}>🛒</Text>
        <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
        <Text style={styles.emptyText}>Thêm sản phẩm để bắt đầu mua sắm</Text>
        <Pressable style={styles.exploreBtn} onPress={() => nav.navigate('Home')}>
          <Text style={styles.exploreBtnText}>Khám phá sản phẩm</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Giỏ hàng</Text>
          <Text style={styles.subtitle}>{cart?.itemCount ?? items.length} sản phẩm</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id ?? item.product?.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 280 }}
        ListHeaderComponent={
          defaultAddress ? (
            <Pressable style={styles.addressCard} onPress={() => nav.navigate('Addresses')}>
              <Text style={styles.addressIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressName}>{defaultAddress.recipient}</Text>
                <Text style={styles.addressPhone}>{defaultAddress.phone}</Text>
                <Text style={styles.addressText} numberOfLines={2}>{addressText}</Text>
              </View>
              <Text style={styles.addressArrow}>›</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.noAddressCard} onPress={() => nav.navigate('Addresses')}>
              <Text style={styles.addressIcon}>⚠️</Text>
              <Text style={styles.noAddressText}>Thêm địa chỉ giao hàng</Text>
            </Pressable>
          )
        }
        renderItem={({ item }) => {
          const price = Number(item.product?.salePrice ?? item.product?.price ?? item.unitPrice ?? 0);
          const img = item.product?.imageUrl || PLACEHOLDER;
          return (
            <View style={styles.itemCard}>
              <Image source={{ uri: img }} style={styles.itemImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product?.name ?? 'Sản phẩm'}</Text>
                <Text style={styles.itemPrice}>{formatVnd(price)}</Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (item.quantity <= 1) removeItem.mutate(item.product.id);
                      else updateItem.mutate({ productId: item.product.id, quantity: item.quantity - 1 });
                    }}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => updateItem.mutate({ productId: item.product.id, quantity: item.quantity + 1 })}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Pressable onPress={() => removeItem.mutate(item.product.id)}>
                  <Text style={styles.removeBtn}>×</Text>
                </Pressable>
                <Text style={styles.itemSubtotal}>{formatVnd(price * item.quantity)}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.bottomSheet}>
        <Text style={styles.payLabel}>Phương thức thanh toán</Text>
        <View style={styles.payRow}>
          <Pressable
            style={[styles.payOption, paymentMethod === 'COD' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Text style={styles.payEmoji}>💵</Text>
            <Text style={[styles.payText, paymentMethod === 'COD' && { color: 'white' }]}>COD</Text>
          </Pressable>
          <Pressable
            style={[styles.payOption, paymentMethod === 'VNPAY_SANDBOX' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('VNPAY_SANDBOX')}
          >
            <Text style={styles.payEmoji}>🏦</Text>
            <Text style={[styles.payText, paymentMethod === 'VNPAY_SANDBOX' && { color: 'white' }]}>VNPay</Text>
          </Pressable>
          <Pressable
            style={[styles.payOption, paymentMethod === 'VIETQR' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('VIETQR')}
          >
            <Text style={styles.payEmoji}>📱</Text>
            <Text style={[styles.payText, paymentMethod === 'VIETQR' && { color: 'white' }]}>VietQR</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tạm tính ({cart?.itemCount ?? items.length} SP)</Text>
          <Text style={styles.summaryValue}>{formatVnd(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {shippingFee === 0 ? 'Miễn phí' : formatVnd(shippingFee)}
          </Text>
        </View>
        <View style={[styles.summaryRow, { marginTop: 4 }]}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>{formatVnd(total)}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.checkoutBtn, pressed && { opacity: 0.85 }, busy && { opacity: 0.7 }]}
          onPress={checkout}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.checkoutText}>Đặt hàng • {formatVnd(total)}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  exploreBtn: {
    marginTop: 20, backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  exploreBtnText: { color: 'white', fontWeight: '700' },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', padding: 14, borderRadius: 12, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  addressIcon: { fontSize: 22 },
  addressName: { fontSize: 14, fontWeight: '700', color: colors.text },
  addressPhone: { fontSize: 12, color: colors.textMuted },
  addressText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  addressArrow: { fontSize: 22, color: colors.textTertiary },
  noAddressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: colors.warning,
  },
  noAddressText: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  itemCard: {
    flexDirection: 'row', backgroundColor: 'white', padding: 12,
    borderRadius: 12, marginBottom: 8, gap: 12,
  },
  itemImage: { width: 70, height: 70, borderRadius: 10, backgroundColor: colors.bgAlt },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  itemPrice: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: colors.text },
  qtyValue: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeBtn: { fontSize: 22, color: colors.danger, fontWeight: '700', padding: 4 },
  itemSubtotal: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 16 },
  bottomSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'white', padding: 16, paddingBottom: 28,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  payLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  payRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  payOption: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', backgroundColor: colors.bgAlt,
  },
  payOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payEmoji: { fontSize: 16 },
  payText: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  totalLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  checkoutBtn: {
    marginTop: 14, backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  checkoutText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
