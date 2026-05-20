import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/services/queries';

const TYPE_ICONS: Record<string, string> = {
  ORDER: '🛒', PROMOTION: '🎁', EXPIRY: '⏰', SYSTEM: '🔔',
};

export function NotificationsScreen() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const items = data?.items || [];
  const unread = data?.unread || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Thông báo</Text>
        {unread > 0 && (
          <Pressable onPress={() => markAll.mutate()} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Đánh dấu đã đọc</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, !item.isRead && styles.unread]}
              onPress={() => !item.isRead && markRead.mutate(item.id)}
            >
              <View style={[styles.iconWrap, !item.isRead && styles.iconUnread]}>
                <Text style={{ fontSize: 18 }}>{TYPE_ICONS[item.type] || '📩'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, !item.isRead && { fontWeight: '800' }]}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
              </View>
              {!item.isRead && <View style={styles.dot} />}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { color: colors.primary, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.textSecondary },
  card: {
    flexDirection: 'row', backgroundColor: 'white', padding: 12,
    marginBottom: 8, borderRadius: 12, gap: 10, alignItems: 'center',
  },
  unread: { backgroundColor: colors.primarySoft },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  iconUnread: { backgroundColor: 'white' },
  cardTitle: { fontSize: 14, color: colors.text, fontWeight: '600' },
  body: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
