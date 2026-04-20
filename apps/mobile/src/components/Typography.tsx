import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'subtitle' | 'body' | 'label' | 'button' | 'metric';
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function Typography({ 
  children, 
  variant = 'body', 
  color = '#fff', 
  style,
  numberOfLines 
}: TypographyProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'h1':
        return { fontSize: 32, fontWeight: '900' as const, fontFamily: 'Adcure' };
      case 'h2':
        return { fontSize: 18, fontWeight: '800' as const, letterSpacing: 0.5 };
      case 'subtitle':
        return { fontSize: 15, color: '#8c8c8c', fontWeight: '600' as const };
      case 'body':
        return { fontSize: 14, color: '#fff' };
      case 'label':
        return { fontSize: 12, fontWeight: '900' as const, textTransform: 'uppercase' as const, letterSpacing: 1 };
      case 'metric':
        return { fontSize: 28, fontWeight: '900' as const, color: '#ffcc00' };
      case 'button':
        return { fontSize: 14, fontWeight: '900' as const, textTransform: 'uppercase' as const };
      default:
        return {};
    }
  };

  return (
    <Text 
      style={[styles.base, getVariantStyle(), { color }, style]} 
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: '#fff',
  },
});
