import React, { useEffect } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Button/card press: scale down lightly with spring. */
export function AnimatedPressableScale({ children, style, disabled, ...rest }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[style, animStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

type ListItemProps = {
  index?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** List enter: fade + slide up staggered by index. */
export function AnimatedListItem({ index = 0, children, style }: ListItemProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 40, 320)).springify().damping(16)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Simple opacity pulse helper for skeletons (optional). */
export function usePulseOpacity() {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withSpring(1);
  }, [opacity]);
  return opacity;
}
