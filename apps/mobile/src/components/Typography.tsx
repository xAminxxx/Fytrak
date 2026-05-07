import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/tokens';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'display' | 'h1' | 'h2' | 'subtitle' | 'body' | 'bodySmall' | 'label' | 'button' | 'metric';
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: "text" | "header";
}

export function Typography({ 
  children, 
  variant = 'body', 
  color = colors.text, 
  style,
  numberOfLines,
  accessibilityRole,
}: TypographyProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'display':
        return typography.display;
      case 'h1':
        return typography.title;
      case 'h2':
        return typography.heading;
      case 'subtitle':
        return { ...typography.body, color: colors.textMuted };
      case 'body':
        return typography.body;
      case 'bodySmall':
        return typography.bodySmall;
      case 'label':
        return typography.label;
      case 'metric':
        return { ...typography.metric, color: colors.primary };
      case 'button':
        return typography.button;
      default:
        return {};
    }
  };

  return (
    <Text 
      style={[styles.base, getVariantStyle(), { color }, style]} 
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      allowFontScaling
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
});
