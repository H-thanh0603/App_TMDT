export const typography = {
  size: {
    xs: 12, sm: 14, base: 16, lg: 18, xl: 20,
    '2xl': 24, '3xl': 30, '4xl': 36,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2, snug: 1.4, normal: 1.5, relaxed: 1.625,
  },
};

export const spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 48,
};

export const radius = {
  sm: 4, md: 8, base: 12, lg: 16, xl: 20, full: 9999,
};

export const shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
};
