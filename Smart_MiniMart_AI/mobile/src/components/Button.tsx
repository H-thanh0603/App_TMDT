import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface Props {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title, onPress, loading, disabled, variant = 'primary', size = 'md', style, fullWidth,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base, styles[`size_${size}`], styles[`variant_${variant}`],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && { opacity: 0.85 },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading && <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.primary} style={{ marginRight: 8 }} />}
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.base, alignItems: 'center', justifyContent: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  size_sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.base },
  size_md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  size_lg: { paddingVertical: spacing.base, paddingHorizontal: spacing.xl },
  variant_primary: { backgroundColor: colors.primary },
  variant_secondary: { backgroundColor: colors.secondary },
  variant_outline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent' },
  variant_ghost: { backgroundColor: 'transparent' },
  variant_danger: { backgroundColor: colors.danger },
  text: { fontWeight: typography.weight.semibold },
  text_primary: { color: '#fff' },
  text_secondary: { color: '#fff' },
  text_outline: { color: colors.primary },
  text_ghost: { color: colors.primary },
  text_danger: { color: '#fff' },
  textSize_sm: { fontSize: typography.size.sm },
  textSize_md: { fontSize: typography.size.base },
  textSize_lg: { fontSize: typography.size.lg },
});
