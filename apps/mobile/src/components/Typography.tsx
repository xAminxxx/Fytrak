import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'subtitle' | 'body' | 'label' | 'button' | 'metric';
  color?: string;
  style?: TextStyle;
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
        return { fontSize: 36, fontWeight: '900' as const, fontFamily: 'Adcure' };
      case 'h2':
        return { fontSize: 24, fontWeight: '800' as const };
      case 'subtitle':
        return { fontSize: 16, color: '#8c8c8c', fontWeight: '500' as const, lineHeight: 24 };
      case 'body':
        return { fontSize: 14, color: '#fff' };
      case 'label':
        return { fontSize: 11, fontWeight: '900' as const, textTransform: 'uppercase' as const, letterSpacing: 1.5 };
      case 'metric':
        return { fontSize: 28, fontWeight: '900' as const, color: '#ffcc00' };
      case 'button':
        return { fontSize: 18, fontWeight: '900' as const, color: '#000' };
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
