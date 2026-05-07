import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius, spacing, touchTarget, typography } from '../theme/tokens';

interface ButtonProps {
  onPress: () => void;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  accessibilityLabel?: string;
}

export function PrimaryButton({ onPress, title, icon, disabled, style, variant = "primary", accessibilityLabel }: ButtonProps) {
  const isPrimary = variant === "primary";
  const iconColor = disabled ? colors.textFaint : isPrimary ? colors.primaryText : variant === "danger" ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.button,
        styles[variant],
        disabled && styles.buttonDisabled,
        style
      ]}
    >
      <Text style={[styles.text, !isPrimary && styles.textOnDark, variant === "danger" && styles.textDanger, disabled && styles.textDisabled]}>{title}</Text>
      {icon && <Ionicons name={icon} size={20} color={iconColor} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touchTarget.large,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  danger: {
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  buttonDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1.5,
  },
  text: {
    ...typography.button,
    color: colors.primaryText,
  },
  textOnDark: {
    color: colors.text,
  },
  textDanger: {
    color: colors.danger,
  },
  textDisabled: {
    color: colors.textFaint,
  },
});
