import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { theme } from '../../theme';

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  maxLength?: number;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  onFocus?: () => void;
  onContentSizeChange?: (event: any) => void;
  rightLabel?: string;
  border?: boolean;
  minHeight?: number;
};

export function Input({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor = theme.colors.placeholder,
  maxLength,
  multiline = false,
  style,
  inputStyle,
  accessibilityLabel,
  onFocus,
  onContentSizeChange,
  rightLabel,
  border = false,
  minHeight,
}: InputProps) {
  return (
    <View style={[styles.container, border && styles.border, style]}>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        maxLength={maxLength}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          minHeight ? { minHeight } : null,
          Platform.OS === 'web' ? styles.webNoOutline : null,
          inputStyle,
        ]}
        value={value}
        onFocus={onFocus}
        onContentSizeChange={onContentSizeChange}
      />
      {rightLabel !== undefined && (
        <Text style={[styles.rightLabel, multiline && styles.multilineRightLabel]}>
          {rightLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  border: {
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xs,
  },
  input: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontSize: theme.typography.sizes.bodySmall,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.regular,
    paddingVertical: theme.spacing.md,
    includeFontPadding: false,
  },
  multilineInput: {
    lineHeight: 20,
    fontFamily: theme.typography.fontFamily,
    textAlignVertical: 'top',
    padding: 0,
    paddingRight: 56,
  },
  rightLabel: {
    alignSelf: 'center',
    color: theme.colors.textCount,
    fontSize: theme.typography.sizes.labelSmall,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold,
    includeFontPadding: false,
    lineHeight: 16,
    marginLeft: theme.spacing.lg,
  },
  multilineRightLabel: {
    position: 'absolute',
    right: 12,
    top: 8,
    marginLeft: 0,
  },
  webNoOutline: {
    outlineStyle: 'none',
  } as never,
});
