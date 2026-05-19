import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<Props> = ({ icon = '○', title, description, action }) => (
  <View style={styles.wrap}>
    <View style={styles.iconCircle}>
      <Text style={styles.icon}>{icon}</Text>
    </View>
    <Text style={styles.title}>{title}</Text>
    {description ? <Text style={styles.desc}>{description}</Text> : null}
    {action ? <View style={styles.action}>{action}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40, marginBottom: 16,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 36, color: colors.primary },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  action: { marginTop: 16 },
});
