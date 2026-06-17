import { Platform, TextStyle } from 'react-native';

export const typography = {
  fontFamily: Platform.select({
    web: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    default: 'Pretendard',
  }),
  sizes: {
    caption: 10,
    labelSmall: 11,
    labelMedium: 12,
    bodySmall: 13,
    bodyMedium: 15,
    titleSmall: 16,
    titleMedium: 18,
    titleLarge: 20,
    heading: 24,
  },
  weights: {
    regular: '400' as const,
    semibold: '600' as const,
    bold: '800' as const,
  },
  presets: {
    headerTitle: {
      fontSize: 16,
      fontWeight: '800' as const,
      lineHeight: 37,
    },
    headerSubtitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 37,
    },
  },
};

export type TypographyType = typeof typography;
