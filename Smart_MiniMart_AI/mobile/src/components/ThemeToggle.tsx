import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { AppIcon } from './AppIcon';

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
        <AppIcon name={isDark ? 'moon' : 'sun'} size={22} color={colors.text} />
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

  const options: Array<{ key: 'light' | 'dark' | 'system'; label: string; icon: 'sun' | 'moon' | 'cog' }> = [
    { key: 'light', label: 'Sáng', icon: 'sun' },
    { key: 'dark', label: 'Tối', icon: 'moon' },
    { key: 'system', label: 'Hệ thống', icon: 'cog' },
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
              <AppIcon name={o.icon} size={16} color={active ? '#fff' : colors.text} />
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
  segLabel: { fontSize: 12, fontWeight: '700' },
});
