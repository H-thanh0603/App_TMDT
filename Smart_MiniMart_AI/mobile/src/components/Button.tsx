import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { radius, spacing, typography } from '@/theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg =
    variant === 'primary' ? colors.primary
      : variant === 'secondary' ? colors.secondary
        : variant === 'danger' ? colors.danger
          : variant === 'outline' || variant === 'ghost' ? 'transparent'
            : colors.primary;

  const borderW = variant === 'outline' ? 1.5 : 0;
  const borderC = variant === 'outline' ? colors.primary : 'transparent';
  const textColor =
    variant === 'outline' || variant === 'ghost' ? colors.primary : '#fff';

  const pad =
    size === 'sm' ? { paddingVertical: spacing.sm, paddingHorizontal: spacing.base }
      : size === 'lg' ? { paddingVertical: spacing.base, paddingHorizontal: spacing.xl }
        : { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };

  const fontSize =
    size === 'sm' ? typography.size.sm
      : size === 'lg' ? typography.size.lg
        : typography.size.base;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => { if (!isDisabled) scale.value = withSpring(0.97, { damping: 16, stiffness: 420 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      style={[
        {
          borderRadius: radius.base,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: borderW,
          borderColor: borderC,
          opacity: isDisabled ? 0.5 : 1,
        },
        pad,
        fullWidth && { alignSelf: 'stretch' },
        animStyle,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'danger' || variant === 'secondary' ? '#fff' : colors.primary}
            style={{ marginRight: 8 }}
          />
        )}
        <Text style={{ fontWeight: typography.weight.semibold, color: textColor, fontSize }}>
          {title}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
