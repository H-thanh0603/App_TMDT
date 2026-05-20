import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useExpiringProducts, useSlowMoving, useRestockSuggestions, useAllOrders,
} from '@/services/queries';
import { useAuthStore } from '@/store/auth.store';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/theme/colors';
import { formatVnd } from '@/utils/format';

export function AdminDashboardScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuthStore();
  const { data: orders } = useAllOrders({ limit: 100 });
  const { data: expiring = [] } = useExpiringProducts(30);
  const { data: slow = [] } = useSlowMoving();
  const { data: restock = [] } = useRestockSuggestions();

  const orderItems = orders?.items ?? [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const todayOrders = orderItems.filter((o: any) =>
    new Date(o.createdAt).getTime() >= today.getTime());
  const completedOrders = orderItems.filter((o: any) => o.status === 'COMPLETED');
  const todayRevenue = todayOrders
    .filter((o: any) => o.status !== 'CANCELED')
    .reduce((s: number, o: any) => s + Number(o.totalAmount), 0);
  const totalRevenue = completedOrders.reduce((s: number, o: any) => s + Number(o.totalAmount), 0);
  const pendingOrders = orderItems.filter((o: any) => o.status === 'PENDING').length;

  const critical = expiring.filter((p: any) => p.alertTier === 'CRITICAL').length;
  const urgentRestock = restock.filter((p: any) => p.urgency === 'HIGH').length;
  const totalAlerts = critical + urgentRestock + slow.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Header gradient */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>{user?.fullName?.split(' ').pop() ?? 'Quản lý'} 👋</Text>
            <Text style={styles.subtitle}>Tổng quan hôm nay</Text>
          </View>
          <Pressable style={styles.notifBtn} onPress={() => nav.navigate('Notifications')}>
            <Text style={styles.notifIcon}>🔔</Text>
            {totalAlerts > 0 && (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>{totalAlerts}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* KPI Grid 2x2 with StatCard */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <StatCard
              label="Doanh thu hôm nay"
              value={formatVnd(todayRevenue)}
              icon="₫"
              variant="primary"
              style={{ marginRight: 6 }}
            />
            <StatCard
              label="Đơn hôm nay"
              value={todayOrders.length}
              icon="🛒"
              variant="info"
              style={{ marginLeft: 6 }}
            />
          </View>
          <View style={styles.kpiRow}>
            <StatCard
              label="Tổng doanh thu"
              value={formatVnd(totalRevenue)}
              icon="📈"
              variant="ai"
              style={{ marginRight: 6 }}
            />
            <StatCard
              label="Tổng đơn"
              value={orderItems.length}
              icon="📦"
              variant="gold"
              style={{ marginLeft: 6 }}
            />
          </View>
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="📁" label="Danh mục" color={colors.primary} onPress={() => nav.navigate('Categories')} />
          <QuickAction icon="🎁" label="KM/Voucher" color={colors.ai} onPress={() => nav.navigate('Promotions')} />
          <QuickAction icon="📋" label="Kho hàng" color={colors.warning} onPress={() => nav.navigate('Inventory')} />
          <QuickAction icon="👥" label="Nhân viên" color={colors.info} onPress={() => nav.navigate('Users')} />
        </View>

        {/* Alerts */}
        <View style={styles.alertHeader}>
          <Text style={styles.sectionTitle}>Cảnh báo cần xử lý</Text>
          {totalAlerts > 0 && <Badge label={`${totalAlerts}`} variant="danger" size="md" />}
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {critical > 0 && (
            <Card variant="elevated" padding={14}>
              <View style={styles.alertRow}>
                <View style={[styles.alertIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={styles.alertEmoji}>⏰</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.alertTitle}>Sắp hết hạn</Text>
                    <Badge label="GẤP" variant="danger" />
                  </View>
                  <Text style={styles.alertDesc}>{critical} sản phẩm cần xử lý ngay</Text>
                </View>
                <Pressable onPress={() => nav.navigate('Inventory')}>
                  <Text style={styles.alertGo}>›</Text>
                </Pressable>
              </View>
            </Card>
          )}

          {urgentRestock > 0 && (
            <Card variant="elevated" padding={14}>
              <View style={styles.alertRow}>
                <View style={[styles.alertIcon, { backgroundColor: colors.aiSoft }]}>
                  <Text style={styles.alertEmoji}>📥</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.alertTitle}>Cần nhập hàng</Text>
                    <Badge label="HIGH" variant="ai" />
                  </View>
                  <Text style={styles.alertDesc}>{urgentRestock} SP sắp hết kho</Text>
                </View>
                <Pressable onPress={() => nav.navigate('Inventory')}>
                  <Text style={styles.alertGo}>›</Text>
                </Pressable>
              </View>
            </Card>
          )}

          {slow.length > 0 && (
            <Card variant="elevated" padding={14}>
              <View style={styles.alertRow}>
                <View style={[styles.alertIcon, { backgroundColor: colors.goldSoft }]}>
                  <Text style={styles.alertEmoji}>🐢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.alertTitle}>Bán chậm</Text>
                    <Badge label="AI" variant="gold" />
                  </View>
                  <Text style={styles.alertDesc}>{slow.length} SP cần KM</Text>
                </View>
                <Pressable onPress={() => nav.navigate('Promotions')}>
                  <Text style={styles.alertGo}>›</Text>
                </Pressable>
              </View>
            </Card>
          )}

          {totalAlerts === 0 && (
            <Card variant="outlined" padding={20}>
              <Text style={styles.emptyAlertText}>✨ Mọi thứ đang ổn, không có cảnh báo!</Text>
            </Card>
          )}
        </View>

        {/* Pending orders quick summary */}
        {pendingOrders > 0 && (
          <View style={{ padding: 16 }}>
            <Pressable
              style={styles.pendingCard}
              onPress={() => nav.navigate('Orders')}
            >
              <Text style={styles.pendingTitle}>{pendingOrders} đơn chờ xác nhận</Text>
              <Text style={styles.pendingSub}>Bấm để xử lý ngay →</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, color, onPress }: any) {
  return (
    <Pressable style={styles.quickItem} onPress={onPress}>
      <View style={[styles.quickIconBg, { backgroundColor: color + '20' }]}>
        <Text style={styles.quickEmoji}>{icon}</Text>
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  userName: { color: 'white', fontSize: 22, fontWeight: '800', marginTop: 2 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifIcon: { fontSize: 22 },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDotText: { color: 'white', fontSize: 10, fontWeight: '800' },
  kpiGrid: { padding: 12, marginTop: -16 },
  kpiRow: { flexDirection: 'row', marginBottom: 12 },
  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: colors.text,
    marginHorizontal: 16, marginTop: 12, marginBottom: 12,
  },
  quickGrid: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  quickItem: { flex: 1, alignItems: 'center' },
  quickIconBg: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  quickEmoji: { fontSize: 26 },
  quickLabel: { fontSize: 12, color: colors.text, fontWeight: '600' },
  alertHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 12, marginBottom: 12,
  },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  alertEmoji: { fontSize: 22 },
  alertTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  alertDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  alertGo: { fontSize: 24, color: colors.primary, fontWeight: '700' },
  emptyAlertText: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
  pendingCard: {
    backgroundColor: colors.aiSoft, padding: 16,
    borderRadius: 12, alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: colors.ai,
  },
  pendingTitle: { fontSize: 15, fontWeight: '800', color: colors.aiDark },
  pendingSub: { fontSize: 12, color: colors.aiDark, marginTop: 4 },
});
