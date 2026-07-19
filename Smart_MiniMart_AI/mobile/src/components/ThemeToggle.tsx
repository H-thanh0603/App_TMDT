import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme } from '@/theme';

type Props = {
  /** compact = switch only row used in profile menus */
  compact?: boolean;
};

/** Dark/Light/System toggle — dùng trong Profile. */
export function ThemeToggle({ compact = false }: Props) {
  const { colors, isDark, preference, setPreference, toggle } = useTheme();

  if (compact) {
    return (
      <View style={[styles.row, { borderTopColor: colors.borderLight }]}>
        <Text style={styles.icon}>{isDark ? '🌙' : '☀️'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Giao diện tối</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {preference === 'system' ? 'Theo hệ thống' : isDark ? 'Đang bật' : 'Đang tắt'}
          </Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={() => { void toggle(); }}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
    );
  }

  const options: Array<{ key: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
    { key: 'light', label: 'Sáng', icon: '☀️' },
    { key: 'dark', label: 'Tối', icon: '🌙' },
    { key: 'system', label: 'Hệ thống', icon: '⚙️' },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Giao diện</Text>
      <View style={styles.seg}>
        {options.map((o) => {
          const active = preference === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => { void setPreference(o.key); }}
              style={[
                styles.segBtn,
                {
                  backgroundColor: active ? colors.primary : colors.bgAlt,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.segIcon}>{o.icon}</Text>
              <Text style={[styles.segLabel, { color: active ? '#fff' : colors.text }]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  icon: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  seg: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  segIcon: { fontSize: 16 },
  segLabel: { fontSize: 12, fontWeight: '700' },
});
