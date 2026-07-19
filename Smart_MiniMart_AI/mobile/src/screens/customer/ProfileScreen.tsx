import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/auth.store';
import { useMyStats } from '@/services/queries';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { colors } from '@/theme/colors';
import { formatVnd } from '@/utils/format';

export function ProfileScreen() {
  const nav = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { data: stats } = useMyStats();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const points = stats?.loyaltyPoints ?? user?.loyaltyPoints ?? 0;
  const isVip = stats?.isVip ?? user?.isVip ?? false;
  const vipProgress = Math.min(100, (points / 1000) * 100);

  const menuGroups = [
    {
      title: 'Đơn hàng',
      items: [
        { icon: '📦', title: 'Đơn hàng của tôi', screen: 'Orders', subtitle: `${stats?.orderCount ?? 0} đơn` },
        { icon: '🚚', title: 'Đang giao', screen: 'Orders', filter: 'DELIVERING' },
      ],
    },
    {
      title: 'Tài khoản',
      items: [
        { icon: '📍', title: 'Địa chỉ giao hàng', screen: 'Addresses' },
        { icon: '🔔', title: 'Thông báo', screen: 'Notifications' },
      ],
    },
    {
      title: 'Khác',
      items: [
        { icon: 'ℹ️', title: 'Về Smart MiniMart AI', screen: null },
        { icon: '⚙️', title: 'Cài đặt', screen: null },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header với gradient */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0).toUpperCase() ?? '👤'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{user?.fullName}</Text>
              {isVip && <Badge label="✨ VIP" variant="gold" size="md" />}
            </View>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.phone && <Text style={styles.email}>{user.phone}</Text>}
          </View>
        </View>

        {/* VIP Progress */}
        <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
          <Card variant="elevated" padding={16}>
            <View style={styles.vipHeader}>
              <Text style={styles.vipLabel}>
                {isVip ? '⭐ Thành viên VIP' : 'Tiến độ lên VIP'}
              </Text>
              <Text style={styles.vipPoints}>{points} / 1000 điểm</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${vipProgress}%` }]} />
            </View>
            {!isVip && (
              <Text style={styles.vipHint}>
                Cần thêm {1000 - points} điểm để lên VIP, giảm 5% mọi đơn hàng
              </Text>
            )}
          </Card>
        </View>

        {/* Stats grid */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats?.orderCount ?? 0}</Text>
            <Text style={styles.statLabel}>Tổng đơn</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.gold }]}>{points}</Text>
            <Text style={styles.statLabel}>Điểm thưởng</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { fontSize: 14 }]}>{formatVnd(stats?.totalSpent ?? 0)}</Text>
            <Text style={styles.statLabel}>Đã mua</Text>
          </View>
        </View>

        {/* Menu groups */}
        {menuGroups.map((group) => (
          <View key={group.title} style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>{group.title}</Text>
            {group.items.map((m: any) => (
              <Pressable
                key={m.title}
                style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
                onPress={() => {
                  if (m.screen) nav.navigate(m.screen, m.filter ? { filter: m.filter } : undefined);
                  else Alert.alert(m.title, 'Tính năng sắp ra mắt');
                }}
              >
                <Text style={styles.menuIcon}>{m.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuText}>{m.title}</Text>
                  {m.subtitle && <Text style={styles.menuSubtitle}>{m.subtitle}</Text>}
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        ))}

        {/* Theme */}
                <View style={styles.menuGroup}>
                  <Text style={styles.menuGroupTitle}>Giao diện</Text>
                  <ThemeToggle compact />
                </View>

                {/* Logout */}
                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                  <Text style={styles.logoutText}>Đăng xuất</Text>
                </Pressable>

        <Text style={styles.versionText}>Smart MiniMart AI v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 18, fontWeight: '800', color: 'white', maxWidth: 200 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  vipHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  vipLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
  vipPoints: { fontSize: 13, fontWeight: '700', color: colors.gold },
  progressBar: {
    height: 8, backgroundColor: colors.bgAlt, borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: 8, backgroundColor: colors.gold, borderRadius: 4 },
  vipHint: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  statsRow: {
    flexDirection: 'row', backgroundColor: 'white',
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  menuGroup: {
    backgroundColor: 'white', marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, overflow: 'hidden',
  },
  menuGroupTitle: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  menuIcon: { fontSize: 22 },
  menuText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  menuSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  menuArrow: { fontSize: 22, color: colors.textMuted },
  logoutBtn: {
    marginHorizontal: 16, marginTop: 24, padding: 14,
    backgroundColor: '#FEE2E2', borderRadius: 12, alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  versionText: {
    textAlign: 'center', color: colors.textMuted,
    fontSize: 11, marginTop: 16,
  },
});
