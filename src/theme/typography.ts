import { Platform } from 'react-native';

export type TextSizePreference = 'small' | 'default' | 'large';

export const textSizeScales: Record<TextSizePreference, number> = {
  small: 0.92,
  default: 1,
  large: 1.15,
};

export const scaleFontSize = (fontSize: number, scale: number) =>
  Math.round(fontSize * scale);

export const pretendardFamilies = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extraBold: 'Pretendard-ExtraBold',
  black: 'Pretendard-Black',
} as const;

export const displayFontFamily = Platform.select({
  web: 'Cafe24SsurroundAir, Pretendard, system-ui, sans-serif',
  default: 'Cafe24SsurroundAir',
});

export const typography = {
  fontFamily: Platform.select({
    web: 'Pretendard, Pretendard-Regular, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    default: 'Pretendard',
  }),
  families: pretendardFamilies,
  displayFontFamily,
  sizes: {
    caption: 11,
    labelSmall: 12,
    labelMedium: 13,
    bodySmall: 14,
    bodyMedium: 16,
    titleSmall: 17,
    titleMedium: 19,
    titleLarge: 22,
    heading: 26,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
    black: '900' as const,
  },
  presets: {
    headerTitle: {
      fontSize: 17,
      fontWeight: '800' as const,
      lineHeight: 24,
    },
    headerSubtitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 23,
    },
  },
};

export type TypographyType = typeof typography;
