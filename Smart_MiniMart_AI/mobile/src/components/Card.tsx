import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'gradient';
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children, variant = 'elevated', padding = 16, style, ...rest
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.card },
        variant === 'elevated' && { shadowColor: colors.shadow },
        variant === 'outlined' && { borderWidth: 1, borderColor: colors.border },
        { padding },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: { borderRadius: 16 },
  elevated: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
