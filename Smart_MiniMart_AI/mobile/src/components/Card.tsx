import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'gradient';
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children, variant = 'elevated', padding = 16, style, ...rest
}) => {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
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
  base: { backgroundColor: colors.card, borderRadius: 16 },
  elevated: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  outlined: { borderWidth: 1, borderColor: colors.border },
});
