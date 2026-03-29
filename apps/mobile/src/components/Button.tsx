import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface ButtonProps {
  onPress: () => void;
  title: string;
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({ onPress, title, icon, disabled, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button, 
        disabled && styles.buttonDisabled,
        style
      ]}
    >
      <Text style={styles.text}>{title}</Text>
      {icon && <Ionicons name={icon as any} size={20} color="#000" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonDisabled: {
    backgroundColor: '#161616',
    opacity: 0.5,
  },
  text: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
  },
});
