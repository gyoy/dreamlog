import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  borderRadius?: number;
  shadow?: boolean;
  border?: boolean;
};

export function Card({
  children,
  style,
  padding = theme.spacing.xl,
  borderRadius = theme.radius.lg,
  shadow = true,
  border = false,
}: CardProps) {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? '#201a39' : theme.colors.cardSurface },
        shadow && theme.shadows.card,
        border && styles.border,
        { padding, borderRadius },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
  },
  border: {
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
});
