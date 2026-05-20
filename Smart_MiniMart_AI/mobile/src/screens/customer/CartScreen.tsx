import React, { useState } from 'react';
import {
  Alert, FlatList, Image, StyleSheet, Text, View, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useCart, useUpdateCartItem, useRemoveCartItem, useCreateOrder, useAddresses,
} from '@/services/queries';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { colors } from '@/theme/colors';
import { formatVnd } from '@/utils/format';

export function CartScreen() {
  const nav = useNavigation<any>();
  const { data: cart, isLoading } = useCart();
  const { data: addresses = [] } = useAddresses();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const createOrder = useCreateOrder();
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VNPAY'>('COD');

  const defaultAddress = addresses.find((a: any) => a.isDefault) ?? addresses[0];

  const checkout = async () => {
    if (!defaultAddress) {
      Alert.alert('Chưa có địa chỉ', 'Vui lòng thêm địa chỉ giao hàng trước', [
        { text: 'Hủy' },
        { text: 'Thêm địa chỉ', onPress: () => nav.navigate('Addresses') },
      ]);
      return;
    }
    Alert.alert(
      'Xác nhận đặt hàng',
      `Tổng tiền: ${formatVnd(cart?.subtotal ?? 0)}\nThanh toán: ${paymentMethod === 'COD' ? 'COD' : 'VNPay'}\nGiao đến: ${defaultAddress.fullAddress}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt hàng',
          onPress: async () => {
            try {
              const order = await createOrder.mutateAsync({
                paymentMethod,
                addressId: defaultAddress.id,
              });
              Alert.alert(
                'Đặt hàng thành công 🎉',
                `Mã đơn: #${(order as any).orderNumber || ''}`,
                [{ text: 'Xem đơn', onPress: () => nav.navigate('Orders') }],
              );
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message ?? 'Đặt hàng thất bại');
            }
          },
        },
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

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <Text style={{ fontSize: 80 }}>🛒</Text>
        <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
        <Text style={styles.emptyText}>Khám phá sản phẩm và thêm vào giỏ</Text>
        <Pressable
          style={styles.exploreBtn}
          onPress={() => nav.navigate('Home')}
        >
          <Text style={styles.exploreBtnText}>Khám phá ngay →</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Giỏ hàng</Text>
          <Text style={styles.subtitle}>{cart.itemCount} sản phẩm</Text>
        </View>
      </View>

      <FlatList
        data={cart.items}
        keyExtractor={(it: any) => it.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 280 }}
        ListHeaderComponent={
          defaultAddress ? (
            <Pressable
              style={styles.addressCard}
              onPress={() => nav.navigate('Addresses')}
            >
              <Text style={styles.addressIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.addressName}>{defaultAddress.recipientName}</Text>
                  <Text style={styles.addressPhone}>{defaultAddress.recipientPhone}</Text>
                  {defaultAddress.isDefault && <Badge label="Mặc định" variant="success" size="sm" />}
                </View>
                <Text style={styles.addressText} numberOfLines={2}>
                  {defaultAddress.fullAddress}
                </Text>
              </View>
              <Text style={styles.addressArrow}>›</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.noAddressCard}
              onPress={() => nav.navigate('Addresses')}
            >
              <Text style={{ fontSize: 28 }}>📍</Text>
              <Text style={styles.noAddressText}>Thêm địa chỉ giao hàng →</Text>
            </Pressable>
          )
        }
        renderItem={({ item }) => {
          const price = Number(item.product.salePrice ?? item.product.price);
          return (
            <View style={styles.itemCard}>
              <Image
                source={{ uri: item.product.imageUrl ?? 'https://via.placeholder.com/80' }}
                style={styles.itemImage}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                <Text style={styles.itemPrice}>{formatVnd(price)}</Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (item.quantity > 1) {
                        updateItem.mutate({ productId: item.product.id, quantity: item.quantity - 1 });
                      } else {
                        removeItem.mutate(item.product.id);
                      }
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
                <Pressable onPress={() => removeItem.mutate(item.id)}>
                  <Text style={styles.removeBtn}>×</Text>
                </Pressable>
                <Text style={styles.itemSubtotal}>
                  {formatVnd(price * item.quantity)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom sheet: payment + checkout */}
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
            style={[styles.payOption, paymentMethod === 'VNPAY' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('VNPAY')}
          >
            <Text style={styles.payEmoji}>🏦</Text>
            <Text style={[styles.payText, paymentMethod === 'VNPAY' && { color: 'white' }]}>VNPay</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tạm tính ({cart.itemCount} SP)</Text>
          <Text style={styles.summaryValue}>{formatVnd(cart.subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>Miễn phí</Text>
        </View>
        <View style={[styles.summaryRow, { marginTop: 4 }]}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>{formatVnd(cart.subtotal)}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.checkoutBtn, pressed && { opacity: 0.85 }]}
          onPress={checkout}
          disabled={createOrder.isPending}
        >
          {createOrder.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.checkoutText}>Đặt hàng • {formatVnd(cart.subtotal)}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', padding: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  exploreBtn: {
    marginTop: 24, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: colors.primary, borderRadius: 12,
  },
  exploreBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },

  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', padding: 14, borderRadius: 12, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  addressIcon: { fontSize: 24 },
  addressName: { fontSize: 14, fontWeight: '800', color: colors.text },
  addressPhone: { fontSize: 12, color: colors.textMuted },
  addressText: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },
  addressArrow: { fontSize: 22, color: colors.textMuted },
  noAddressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: colors.warning,
  },
  noAddressText: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  itemCard: {
    flexDirection: 'row', backgroundColor: 'white', padding: 12,
    borderRadius: 12, marginBottom: 8, gap: 12,
    shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  itemImage: { width: 70, height: 70, borderRadius: 10, backgroundColor: colors.bgAlt },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 18 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: colors.primary, marginTop: 4 },
  itemSubtotal: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 28 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.bgAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '800', color: colors.text },
  qtyValue: { fontSize: 14, fontWeight: '800', color: colors.text, minWidth: 24, textAlign: 'center' },
  removeBtn: { fontSize: 22, color: colors.danger, fontWeight: '800', padding: 4 },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', padding: 16,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 }, elevation: 8,
  },
  payLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '700', marginBottom: 8 },
  payRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  payOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 10, borderRadius: 10,
    backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border,
  },
  payOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payEmoji: { fontSize: 18 },
  payText: { fontSize: 13, fontWeight: '700', color: colors.text },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  totalLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: 18, fontWeight: '900', color: colors.primary },

  checkoutBtn: {
    backgroundColor: colors.primary, padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 12,
  },
  checkoutText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
