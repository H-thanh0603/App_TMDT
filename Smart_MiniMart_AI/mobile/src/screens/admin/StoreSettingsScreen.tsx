import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { useAdminSettings, useUpdateSetting } from '@/services/queries';
import { colors } from '@/theme/colors';

export function StoreSettingsScreen() {
  const settings = useAdminSettings();
  const save = useUpdateSetting();
  const [info, setInfo] = useState<any>({});
  const [policies, setPolicies] = useState<any>({});
  const [payment, setPayment] = useState<any>({});
  useEffect(() => {
    const byKey = Object.fromEntries((settings.data ?? []).map((s: any) => [s.key, s.value]));
    setInfo(byKey.STORE_INFO ?? {}); setPolicies(byKey.STORE_POLICIES ?? {}); setPayment(byKey.PAYMENT_METHODS ?? {});
  }, [settings.data]);
  const submit = async () => {
    try {
      await Promise.all([
        save.mutateAsync({ key: 'STORE_INFO', value: info }),
        save.mutateAsync({ key: 'STORE_POLICIES', value: { ...policies, minOrderValue: Number(policies.minOrderValue || 0), shippingFee: Number(policies.shippingFee || 0), freeShipThreshold: Number(policies.freeShipThreshold || 0) } }),
        save.mutateAsync({ key: 'PAYMENT_METHODS', value: payment }),
      ]);
      Alert.alert('Đã lưu', 'Cấu hình mới sẽ được áp dụng cho đơn tiếp theo.');
    } catch (error: any) { Alert.alert('Không thể lưu', error?.response?.data?.message ?? 'Vui lòng thử lại.'); }
  };
  const field = (label: string, key: string, value: any, set: (v: any) => void, numeric = false) => <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={String(value?.[key] ?? '')} keyboardType={numeric ? 'numeric' : 'default'} onChangeText={(text) => set({ ...value, [key]: text })} /></View>;
  return <SafeAreaView style={styles.container} edges={['bottom']}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Cài đặt cửa hàng</Text>
    <Text style={styles.section}>Thông tin</Text>
    {field('Tên cửa hàng', 'name', info, setInfo)}{field('Địa chỉ', 'address', info, setInfo)}{field('Điện thoại', 'phone', info, setInfo)}{field('Giờ mở cửa', 'openHours', info, setInfo)}
    <Text style={styles.section}>Đơn hàng & giao hàng</Text>
    {field('Đơn tối thiểu', 'minOrderValue', policies, setPolicies, true)}{field('Phí giao hàng', 'shippingFee', policies, setPolicies, true)}{field('Miễn phí từ', 'freeShipThreshold', policies, setPolicies, true)}
    <Text style={styles.section}>Thanh toán</Text>
    {['cod', 'vnpay', 'bank'].map((key) => <View key={key} style={styles.toggle}><Text>{payment[key]?.label ?? key.toUpperCase()}</Text><Switch value={payment[key]?.enabled !== false} onValueChange={(enabled) => setPayment({ ...payment, [key]: { ...(payment[key] ?? {}), enabled } })} /></View>)}
    <Button title="Lưu thay đổi" fullWidth loading={save.isPending} onPress={() => void submit()} />
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.bgSecondary }, content: { padding: 16, gap: 10 }, title: { fontSize: 22, fontWeight: '800', color: colors.text }, section: { marginTop: 12, fontSize: 15, fontWeight: '800', color: colors.primary }, field: { gap: 5 }, label: { fontSize: 12, color: colors.textSecondary }, input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, color: colors.text }, toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderRadius: 10 } });
