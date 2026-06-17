import React, { useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { theme } from '../../theme';

type ButtonProps = {
  onPress?: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  testID?: string;
};

export function Button({
  onPress,
  label,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
  icon,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      damping: 10,
      stiffness: 300,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      damping: 10,
      stiffness: 240,
    }).start();
  };

  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        isPrimary ? styles.primaryBtn : styles.secondaryBtn,
        isPrimary ? theme.shadows.buttonPrimary : theme.shadows.buttonSecondary,
        Platform.OS === 'web' ? styles.webNoOutline : null,
        disabled && styles.disabled,
        style,
      ]}
      testID={testID}
    >
      <Animated.View style={[styles.inner, { transform: [{ scale: scaleAnim }] }]}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text
          style={[
            isPrimary ? styles.primaryText : styles.secondaryText,
            textStyle,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    height: 44,
    justifyContent: 'center',
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
    borderRadius: theme.radius.xl,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  iconWrap: {
    marginRight: theme.spacing.md,
  },
  primaryText: {
    color: theme.colors.textLight,
    fontSize: theme.typography.sizes.bodyMedium,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold,
  },
  secondaryText: {
    color: theme.colors.accent,
    fontSize: theme.typography.sizes.bodyMedium,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold,
  },
  disabled: {
    opacity: 0.5,
  },
  webNoOutline: {
    outlineStyle: 'none',
  } as never,
});
