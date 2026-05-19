import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCart, useUpdateCartItem, useRemoveCartItem, useCreateOrder } from '@/services/queries';
import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/theme';
import { formatVnd } from '@/utils/format';

export function CartScreen() {
  const nav = useNavigation<any>();
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const createOrder = useCreateOrder();

  const checkout = async () => {
    Alert.alert('Xác nhận đặt hàng',
      `Tổng: ${formatVnd(cart?.subtotal ?? 0)}. Thanh toán COD?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đặt hàng', onPress: async () => {
        try {
          await createOrder.mutateAsync({ paymentMethod: 'COD' });
          Alert.alert('Đặt hàng thành công', 'Bạn có thể xem trong "Đơn hàng của tôi".');
        } catch (err: any) {
          Alert.alert('Lỗi', err.response?.data?.message ?? 'Đặt hàng thất bại');
        }
      }},
    ]);
  };

  if (isLoading) {
    return <SafeAreaView style={[styles.container, styles.center]}><Text>Đang tải...</Text></SafeAreaView>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={{ fontSize: 64 }}>🛒</Text>
        <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
        <Text style={styles.emptyText}>Thêm sản phẩm để bắt đầu mua sắm</Text>
        <Button title="Khám phá ngay" onPress={() => nav.navigate('Home')}
          style={{ marginTop: spacing.lg }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>Giỏ hàng ({cart.itemCount})</Text></View>

      <FlatList
        data={cart.items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const price = Number(item.product.salePrice ?? item.product.price);
          return (
            <View style={styles.itemCard}>
              <Image source={{ uri: item.product.imageUrl ?? 'https://via.placeholder.com/80' }}
                style={styles.itemImage} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                <Text style={styles.itemPrice}>{formatVnd(price)}</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn}
                    onPress={() => item.quantity > 1
                      ? updateItem.mutate({ productId: item.productId, quantity: item.quantity - 1 })
                      : removeItem.mutate(item.productId)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn}
                    onPress={() => updateItem.mutate({ productId: item.productId, quantity: item.quantity + 1 })}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeItem.mutate(item.productId)}
                    style={{ marginLeft: 'auto' }}>
                    <Text style={styles.removeText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={styles.totalLabel}>Tạm tính</Text>
          <Text style={styles.totalValue}>{formatVnd(cart.subtotal)}</Text>
        </View>
        <Button title={`Thanh toán • ${formatVnd(cart.subtotal)}`}
          onPress={checkout} loading={createOrder.isPending} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  header: { padding: spacing.lg },
  title: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text, marginTop: spacing.md },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  itemCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.base, padding: spacing.sm, marginBottom: spacing.sm },
  itemImage: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.bgSecondary },
  itemName: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.text },
  itemPrice: { color: colors.primary, fontWeight: typography.weight.bold, marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, color: colors.text },
  qty: { marginHorizontal: spacing.md, fontWeight: typography.weight.semibold, fontSize: typography.size.base },
  removeText: { color: colors.danger, fontSize: typography.size.sm },
  footer: { padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { color: colors.textSecondary, fontSize: typography.size.sm },
  totalValue: { fontWeight: typography.weight.bold, color: colors.text, fontSize: typography.size.lg },
});
